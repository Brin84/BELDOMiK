"""Резолвер базового t.me-URL для глубоких ссылок MiniApp (startapp=...).

Проверенный на проде рабочий формат: https://t.me/<бот>?startapp=<param> —
база БЕЗ пути (/app резолвится в чат бота, а не в приложение). Формат с
суффиксом t.me/<бот>/<имя> актуален только если в BotFather зарегистрировано
короткое имя — тогда его задают через TELEGRAM_MINIAPP_URL.
TELEGRAM_WEBAPP_URL в deep-link не участвует (в проде это хостинговая SPA-ссылка).
"""
import pytest

from app.core.config import settings
from app.services.notification_service import NotificationService


@pytest.fixture(autouse=True)
def _reset_telegram_urls(monkeypatch):
    """Изолируем резолвер от значений прод/дев .env."""
    monkeypatch.setattr(settings, "TELEGRAM_MINIAPP_URL", "")
    monkeypatch.setattr(settings, "TELEGRAM_WEBAPP_URL", "")
    monkeypatch.setattr(settings, "TELEGRAM_BOT_USERNAME", "beldomik_bot")


def test_uses_explicit_miniapp_url_first(monkeypatch):
    monkeypatch.setattr(settings, "TELEGRAM_MINIAPP_URL", "https://t.me/bot_web/app")

    assert NotificationService.miniapp_deep_link("property_123") == (
        "https://t.me/bot_web/app?startapp=property_123"
    )


def test_swallows_trailing_slash(monkeypatch):
    monkeypatch.setattr(settings, "TELEGRAM_MINIAPP_URL", "https://t.me/bot_web/app/")

    assert NotificationService.miniapp_deep_link("chat_7") == (
        "https://t.me/bot_web/app?startapp=chat_7"
    )


def test_default_base_is_bot_username_without_path():
    """Нет MINIAPP_URL → база t.me/<бот> БЕЗ суффикса; ?startapp в query."""
    assert NotificationService.miniapp_deep_link() == "https://t.me/beldomik_bot"
    assert NotificationService.miniapp_deep_link("property_1") == (
        "https://t.me/beldomik_bot?startapp=property_1"
    )


def test_webapp_url_does_not_affect_deep_link(monkeypatch):
    """TELEGRAM_WEBAPP_URL — хостинговая SPA для /start web_app-кнопки; даже в
    t.me-форме он не должен влиять на deep-link (проверено живым тапом)."""
    monkeypatch.setattr(settings, "TELEGRAM_WEBAPP_URL", "https://t.me/beldomik_by/app")

    assert NotificationService.miniapp_deep_link("property_5") == (
        "https://t.me/beldomik_bot?startapp=property_5"
    )


def test_base_url_without_param_no_explicit():
    assert NotificationService.miniapp_deep_link() == "https://t.me/beldomik_bot"


async def test_channel_post_has_open_and_write_buttons(monkeypatch):
    """В посте объявления в канале две кнопки: «Открыть объявление» и
    «Написать продавцу» (вторая — под первой)."""
    monkeypatch.setattr(settings, "CHANNEL_URL", "https://t.me/beldomik_channel")
    captured: dict = {}

    async def _capture(chat_id, text, reply_markup=None, **kwargs):
        captured["chat_id"] = chat_id
        captured["reply_markup"] = reply_markup
        return True

    monkeypatch.setattr(NotificationService, "send_telegram_message", _capture)

    await NotificationService.post_property_to_channel(
        property_id=42,
        type_name="Квартира",
        operation_name="Продажа",
        city_name="Минск",
        district_name="Центральный",
        price_byn=342000,
        price_usd=106875,
        total_area=78.0,
        rooms_count=3,
        description="Описание",
        photo_url=None,
    )

    keyboard = captured["reply_markup"]["inline_keyboard"]
    assert len(keyboard) == 2
    assert keyboard[0][0]["text"] == "👀 Открыть объявление"
    assert keyboard[0][0]["url"].endswith("?startapp=property_42")
    assert keyboard[1][0]["text"] == "✉️ Написать продавцу"
    assert keyboard[1][0]["url"].endswith("?startapp=write_42")
