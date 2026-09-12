"""Резолвер базового t.me-URL для глубоких ссылок MiniApp (startapp=...).

Баг канала: кнопка «Открыть объявление» строила ссылку из TELEGRAM_BOT_USERNAME +
TELEGRAM_MINIAPP_PATH, но реальный MiniApp может жить под другим ботом/суффиксом
(BotFather), и t.me/<бот>/<суффикс> резолвился в чат бота, а не в приложение.
Правильный приоритет базы: TELEGRAM_MINIAPP_URL → TELEGRAM_WEBAPP_URL (если это
t.me-ссылка) → bot_username + mini_app_path.
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
    monkeypatch.setattr(settings, "TELEGRAM_MINIAPP_PATH", "app")


def test_uses_explicit_miniapp_url_first(monkeypatch):
    monkeypatch.setattr(settings, "TELEGRAM_MINIAPP_URL", "https://t.me/bot_web/app")
    monkeypatch.setattr(settings, "TELEGRAM_WEBAPP_URL", "https://t.me/bot_other/app")

    assert NotificationService.miniapp_deep_link("property_123") == (
        "https://t.me/bot_web/app?startapp=property_123"
    )


def test_uses_tme_webapp_url_when_no_explicit(monkeypatch):
    """WEBAPP_URL в t.me-форме — рабочая база для inline-кнопок."""
    monkeypatch.setattr(settings, "TELEGRAM_WEBAPP_URL", "https://t.me/bot_web/app")

    assert NotificationService.miniapp_deep_link("property_123") == (
        "https://t.me/bot_web/app?startapp=property_123"
    )


def test_swallows_trailing_slash(monkeypatch):
    monkeypatch.setattr(settings, "TELEGRAM_WEBAPP_URL", "https://t.me/bot_web/app/")

    assert NotificationService.miniapp_deep_link("chat_7") == (
        "https://t.me/bot_web/app?startapp=chat_7"
    )


def test_falls_back_to_bot_username_and_path(monkeypatch):
    """WEBAPP_URL — хостинг SPA (не t.me, для web_app-кнопок) → сборка из username+path."""
    monkeypatch.setattr(settings, "TELEGRAM_WEBAPP_URL", "https://app.example.run.app")

    assert NotificationService.miniapp_deep_link() == "https://t.me/beldomik_bot/app"
    assert NotificationService.miniapp_deep_link("property_1") == (
        "https://t.me/beldomik_bot/app?startapp=property_1"
    )


def test_base_url_without_param(monkeypatch):
    monkeypatch.setattr(settings, "TELEGRAM_MINIAPP_URL", "https://t.me/bot_web/app")

    assert NotificationService.miniapp_deep_link() == "https://t.me/bot_web/app"