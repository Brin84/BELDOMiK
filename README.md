# BELDOMiK 🇧🇾

Telegram Mini App — маркетплейс недвижимости по Беларуси.

## Структура

| Путь | Назначение |
|---|---|
| `backend/` | FastAPI + SQLAlchemy + Alembic. REST API `/api/v1` и раздача собранной SPA |
| `frontend/` | React + TypeScript + Vite (Telegram Mini App) |
| `.github/workflows/deploy.yml` | CI/CD: сборка Docker-образа → Cloud Run |

## Локальный запуск

### Backend

```bash
cd backend
pip install -e ".[dev]"
cp .env.example .env          # заполнить DATABASE_URL, SECRET_KEY, TELEGRAM_BOT_TOKEN
alembic upgrade head
python scripts/seed_data.py       # география, типы недвижимости
python scripts/seed_properties.py  # демо-объявления
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm ci
npm run dev                  # http://localhost:3000, /api проксируется на :8000
```

## Платные услуги

Продвижение объявлений, подписки PRO/Enterprise и рекламные баннеры **не запущены**
(нет статуса ИП/самозанятого). Код сохранён полностью и включается одним флагом:

- `frontend/src/shared/lib/featureFlags.ts` → `MONETIZATION_ENABLED = true`
- backend: env `MONETIZATION_ENABLED=true`

Пока флаг выключен, эндпоинты `/api/v1/monetization/*` отдают 404, а квоты по
подписке не применяются.

## Тесты

```bash
cd backend  && python -m pytest tests -q
cd frontend && npm test
```

## Деплой

Push в `main` → GitHub Actions → Docker (multi-stage: Node 22 → Python 3.12) →
Artifact Registry → Cloud Run (`europe-west1`, сервис `beldomik-backend`).
