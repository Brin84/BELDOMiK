"""Tests for auto-moderation (стандартные правила + публикация/отклонение).

Автомодерация при подаче объявления: прошла правила → PUBLISHED,
не прошла → REJECTED с причиной в moderation_reason.
"""
from unittest.mock import patch

import pytest
from sqlalchemy.orm import Session

from app.models.geography import City
from app.models.property import Property, PropertyPhoto, PropertyPrice, PropertyStatus
from app.models.property_types import OperationType, PropertyType
from app.models.user import User
from app.services.auto_moderation import check_standard_rules
from app.services.property_service import PropertyService


@pytest.fixture
def moderation_seed(db_session: Session, seed_test_data) -> dict:
    owner = User(tg_id=555666777, username="moderation_owner", first_name="Mod", last_name="Owner")
    db_session.add(owner)
    db_session.commit()
    db_session.refresh(owner)

    city = db_session.query(City).filter(City.name == "Минск").first()
    prop_type = db_session.query(PropertyType).filter(PropertyType.name == "Квартира").first()
    op_type = db_session.query(OperationType).filter(OperationType.name == "Продажа").first()

    def make(**overrides) -> Property:
        props = dict(
            owner_id=owner.id,
            type_id=prop_type.id,
            operation_id=op_type.id,
            city_id=city.id,
            address="ул. Ленина, 10",
            total_area=60.0,
            rooms_count=2,
            floor=5,
            total_floors=9,
            build_year=2015,
            description="Уютная квартира рядом с метро в хорошем состоянии",
            contact_name="Иван",
            contact_phone="+375291234567",
            show_phone=True,
        )
        props.update(overrides)
        prop = Property(**props)
        db_session.add(prop)
        db_session.flush()
        db_session.add(
            PropertyPrice(
                property_id=prop.id,
                price_byn=150000,
                price_usd=50000,
                price_per_m2_byn=2500,
                is_current=True,
            )
        )
        db_session.commit()
        db_session.refresh(prop)
        return prop

    return {"owner": owner, "make": make}


def test_standard_rules_pass(moderation_seed):
    prop = moderation_seed["make"]()
    db_session = prop.owner._sa_instance_state.session
    db_session.add(PropertyPhoto(property_id=prop.id, url="https://ex.com/p.jpg"))
    db_session.commit()

    issues = check_standard_rules(prop)
    assert issues == []


def test_standard_rules_no_photo(moderation_seed):
    prop = moderation_seed["make"]()
    issues = check_standard_rules(prop)
    assert any("фотограф" in i for i in issues)


def test_standard_rules_no_price(moderation_seed):
    # property without a PropertyPrice row → price rule fails
    prop = moderation_seed["make"]()
    db_session = prop.owner._sa_instance_state.session
    from app.models.property import PropertyPrice as PP

    db_session.query(PP).filter(PP.property_id == prop.id).delete()
    db_session.commit()
    db_session.refresh(prop)

    issues = check_standard_rules(prop)
    assert any("цен" in i for i in issues)


def test_standard_rules_negotiable_skips_price(moderation_seed):
    # «Договорная цена» (is_negotiable=True, price_byn=0) проходит правило
    # цены — публикация разрешена без фиксированной цены.
    prop = moderation_seed["make"](is_negotiable=True)
    db_session = prop.owner._sa_instance_state.session
    db_session.query(PropertyPrice).filter(PropertyPrice.property_id == prop.id).update(
        {PropertyPrice.price_byn: 0, PropertyPrice.price_usd: None}
    )
    db_session.add(PropertyPhoto(property_id=prop.id, url="https://ex.com/p.jpg"))
    db_session.commit()
    db_session.refresh(prop)

    issues = check_standard_rules(prop)
    assert not any("цен" in i for i in issues)
    assert issues == []


def test_standard_rules_short_description(moderation_seed):
    prop = moderation_seed["make"](description="Ок")
    issues = check_standard_rules(prop)
    assert any("описани" in i for i in issues)


def test_standard_rules_forbidden_contacts(moderation_seed):
    prop = moderation_seed["make"](description="Квартира. Звоните +375 29 123-45-67.")
    issues = check_standard_rules(prop)
    assert any("контакты" in i.lower() or "ссылки" in i for i in issues)


def test_submit_publishes_valid_listing(moderation_seed):
    prop = moderation_seed["make"]()
    db_session = prop.owner._sa_instance_state.session
    db_session.add(PropertyPhoto(property_id=prop.id, url="https://ex.com/p.jpg"))
    db_session.commit()

    with patch("app.services.moderation_service._publish_to_channel") as publish:
        result = PropertyService.submit_for_moderation(db_session, prop.id, moderation_seed["owner"].id)

    assert result is not None
    assert result.status is PropertyStatus.PUBLISHED
    assert result.published_at is not None
    assert result.moderation_reason is None
    publish.assert_called_once()


def test_submit_rejects_incomplete_listing(moderation_seed):
    prop = moderation_seed["make"]()  # no photo
    db_session = prop.owner._sa_instance_state.session

    result = PropertyService.submit_for_moderation(db_session, prop.id, moderation_seed["owner"].id)

    assert result is not None
    assert result.status is PropertyStatus.REJECTED
    assert result.moderation_reason
    assert "фотограф" in result.moderation_reason


def test_submit_allows_resubmit_after_rejection(moderation_seed):
    prop = moderation_seed["make"]()
    db_session = prop.owner._sa_instance_state.session

    first = PropertyService.submit_for_moderation(db_session, prop.id, moderation_seed["owner"].id)
    assert first.status is PropertyStatus.REJECTED

    # Пользователь исправил: добавил фото → повторная подача публикует сразу.
    db_session.add(PropertyPhoto(property_id=prop.id, url="https://ex.com/p.jpg"))
    db_session.commit()

    with patch("app.services.moderation_service._publish_to_channel"):
        second = PropertyService.submit_for_moderation(db_session, prop.id, moderation_seed["owner"].id)

    assert second.status is PropertyStatus.PUBLISHED
    assert second.moderation_reason is None


def test_submit_from_published_is_blocked(moderation_seed):
    prop = moderation_seed["make"]()
    db_session = prop.owner._sa_instance_state.session
    prop.status = PropertyStatus.PUBLISHED
    db_session.commit()

    result = PropertyService.submit_for_moderation(db_session, prop.id, moderation_seed["owner"].id)
    assert result is None