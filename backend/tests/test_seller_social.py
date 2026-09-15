"""Тесты карточки продавца (Барахолка-модель): отзывы/рейтинг, подписки,
аватары из Telegram, доп. поля owner_* в карточке объявления."""

from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.geography import City
from app.models.property import Property, PropertyPrice, PropertyStatus
from app.models.property_types import OperationType, PropertyType
from app.models.user import User, UserProfile


def _auth_headers(user: User) -> dict:
    token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(hours=1),
    )
    return {"Authorization": f"Bearer {token}"}


def _add_user(db_session: Session, tg_id: int, *, avatar: str | None = None) -> User:
    user = User(
        tg_id=tg_id,
        username=f"seller_{tg_id}",
        first_name="Продавец",
        last_name=f"№{tg_id}",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    if avatar:
        db_session.add(UserProfile(user_id=user.id, avatar_url=avatar))
        db_session.commit()
        db_session.refresh(user)
    return user


def _add_property(db_session: Session, owner_id: int, status=PropertyStatus.PUBLISHED) -> Property:
    city = db_session.query(City).filter(City.name == "Минск").first()
    prop_type = db_session.query(PropertyType).filter(PropertyType.name == "Квартира").first()
    op_type = db_session.query(OperationType).filter(OperationType.name == "Продажа").first()
    prop = Property(
        owner_id=owner_id,
        type_id=prop_type.id,
        operation_id=op_type.id,
        city_id=city.id,
        address="ул. Продавцов, 7",
        total_area=60.0,
        rooms_count=2,
        status=status,
    )
    db_session.add(prop)
    db_session.flush()
    db_session.add(
        PropertyPrice(property_id=prop.id, price_byn=120000, price_usd=40000, is_current=True)
    )
    db_session.commit()
    db_session.refresh(prop)
    return prop


class TestSellerCard:
    def test_summary_computes_rating_deals_followers(
        self, db_session: Session, client: TestClient, seed_test_data
    ):
        seller = _add_user(db_session, 1, avatar="https://tg.example/a.jpg")
        buyer = _add_user(db_session, 2)
        _add_property(db_session, seller.id, PropertyStatus.SOLD)  # «сделка»
        _add_property(db_session, seller.id, PropertyStatus.PUBLISHED)  # активное

        headers = _auth_headers(buyer)
        r = client.post(f"/api/v1/users/{seller.id}/follow", headers=headers)
        assert r.status_code == 200, r.text
        summary = r.json()
        assert summary["is_following"] is True
        assert summary["avatar_url"] == "https://tg.example/a.jpg"
        assert summary["deals_count"] == 1  # SOLD учитывается как сделка

        r = client.post(
            "/api/v1/reviews",
            headers=headers,
            json={"user_id": seller.id, "rating": 5, "text": "Отлично!"},
        )
        assert r.status_code == 201, r.text
        r = client.post(
            "/api/v1/reviews",
            headers=headers,
            json={"user_id": seller.id, "rating": 3, "text": "Обновлённый отзыв"},
        )
        assert r.status_code == 201
        assert r.json()["rating"] == 3  # upsert: отзыв один на пару

        r = client.get(f"/api/v1/users/{seller.id}", headers=headers)
        assert r.status_code == 200
        s = r.json()
        assert s["rating"] == 3.0
        assert s["reviews_count"] == 1
        assert s["followers_count"] == 1
        assert s["is_self"] is False
        assert s["deals_count"] == 1

        r = client.get(f"/api/v1/users/{seller.id}/reviews", headers=headers)
        assert r.status_code == 200
        body = r.json()
        assert body["total"] == 1
        assert body["items"][0]["author"]["name"] == "Продавец"
        assert body["items"][0]["author"]["id"] == buyer.id

    def test_follow_unfollow_idempotent_and_self_guard(
        self, db_session: Session, client: TestClient
    ):
        seller = _add_user(db_session, 3)
        buyer = _add_user(db_session, 4)
        h = _auth_headers(buyer)

        r = client.post(f"/api/v1/users/{seller.id}/follow", headers=h)
        assert r.status_code == 200
        r = client.post(f"/api/v1/users/{seller.id}/follow", headers=h)
        assert r.status_code == 200
        assert r.json()["followers_count"] == 1  # идемпотентно

        r = client.post(f"/api/v1/users/{buyer.id}/follow", headers=h)
        assert r.status_code == 400  # нельзя на себя
        assert "себя" in r.json()["detail"]

        r = client.delete(f"/api/v1/users/{seller.id}/follow", headers=h)
        assert r.status_code == 204
        r = client.get(f"/api/v1/users/{seller.id}", headers=h)
        assert r.json()["is_following"] is False

    def test_review_self_guard_and_delete_author_only(
        self, db_session: Session, client: TestClient
    ):
        seller = _add_user(db_session, 5)
        other = _add_user(db_session, 6)
        h_other = _auth_headers(other)

        r = client.post(
            "/api/v1/reviews",
            headers=h_other,
            json={"user_id": other.id, "rating": 5},
        )
        assert r.status_code == 400  # нельзя отзыв о себе

        r = client.post(
            "/api/v1/reviews",
            headers=h_other,
            json={"user_id": seller.id, "rating": 4},
        )
        assert r.status_code == 201
        review_id = r.json()["id"]

        # Чужой удалить не может
        another = _add_user(db_session, 7)
        r = client.delete(f"/api/v1/reviews/{review_id}", headers=_auth_headers(another))
        assert r.status_code == 403

        # Автор удаляет
        r = client.delete(f"/api/v1/reviews/{review_id}", headers=h_other)
        assert r.status_code == 204
        s = client.get(f"/api/v1/users/{seller.id}").json()
        assert s["reviews_count"] == 0

    def test_property_detail_returns_owner_metrics(
        self, db_session: Session, client: TestClient, seed_test_data
    ):
        seller = _add_user(db_session, 8, avatar="https://tg.example/s.jpg")
        buyer = _add_user(db_session, 9)
        prop = _add_property(db_session, seller.id)
        h = _auth_headers(buyer)

        client.post(f"/api/v1/users/{seller.id}/follow", headers=h)
        r = client.get(f"/api/v1/properties/{prop.id}", headers=h)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["owner_id"] == seller.id
        assert body["owner_avatar_url"] == "https://tg.example/s.jpg"
        assert body["owner_followers_count"] == 1
        assert body["owner_is_following"] is True
        assert body["owner_rating"] == 0.0
        assert body["owner_deals_count"] == 0

        # Аноним — состояния подписки нет, но метрики остаются
        r = client.get(f"/api/v1/properties/{prop.id}")
        body = r.json()
        assert body["owner_is_following"] is False
        assert body["owner_followers_count"] == 1

    def test_auth_persists_telegram_avatar(
        self, db_session: Session, client: TestClient, monkeypatch
    ):
        """photo_url из initData сохраняется в user_profiles.avatar_url."""
        import hashlib
        import hmac
        import json
        from urllib.parse import quote

        from app.models.user import User

        tg_user = {
            "id": 777,
            "first_name": "Телеграм",
            "last_name": "Аватар",
            "username": "tg_avatar",
            "photo_url": "https://tg.example/a.png",
        }
        params = {
            "auth_date": str(int(__import__("time").time())),
            "query_id": "AAGG5HpTAQAAAAblp1MTOw",
            "user": json.dumps(tg_user),
        }
        data_check = "\n".join(f"{k}={params[k]}" for k in sorted(params))
        secret = hmac.new(
            b"WebAppData", b"test_bot_token_12345:ABCDEFGHIJKLMNOPQRSTUVWXYZ", hashlib.sha256
        ).digest()
        params["hash"] = hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()

        init_data = "&".join(
            f"{k}={quote(str(v))}" for k, v in params.items() if k != "hash"
        ) + f"&hash={params['hash']}"

        r = client.post("/api/v1/auth/telegram", json={"init_data": init_data})
        assert r.status_code == 200, r.text

        user = db_session.query(User).filter(User.tg_id == 777).first()
        assert user is not None
        assert user.profile is not None
        assert user.profile.avatar_url == "https://tg.example/a.png"