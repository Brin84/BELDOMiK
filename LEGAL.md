# Юридическая информация BELDOMiK

## Структура

### Backend (FastAPI)
**Файл:** `backend/app/api/routes/legal.py`

API endpoints для юридических документов:
- `GET /api/v1/legal/privacy-policy` — Политика конфиденциальности
- `GET /api/v1/legal/terms-of-service` — Пользовательское соглашение
- `GET /api/v1/legal/cookie-policy` — Политика использования cookie
- `GET /api/v1/legal/gdpr` — GDPR compliance
- `GET /api/v1/legal/privacy-by-design` — Privacy by Design
- `GET /api/v1/legal/user-rights` — Права пользователей
- `GET /api/v1/legal/disclaimer` — Отказ от ответственности
- `GET /api/v1/legal/all` — Список всех документов

### Frontend (React)
**Файлы:**
- `frontend/src/features/legal/LegalDocumentsPage.tsx` — Страница просмотра документов
- `frontend/src/widgets/layout/Footer.tsx` — Футер с ссылками на документы
- `frontend/src/widgets/layout/index.ts` — Экспорт layout компонентов

**Роуты:**
- `/legal?doc=<id>` — Просмотр конкретного документа
- `/settings` — Страница настроек с ссылками на юридические документы

## Документы

### 1. Политика конфиденциальности
Описывает:
- Какие данные собираем
- Зачем используем данные
- Права пользователей (GDPR)
- Передача данных третьим лицам

### 2. Пользовательское соглашение
Описывает:
- Условия использования
- Запрещённые действия
- Права на контент
- Платежи и монетизация

### 3. Политика использования cookie
Описывает:
- Какие cookie используем
- Цели использования
- Управление cookie

### 4. GDPR compliance
Описывает:
- Права субъектов данных (Articles 15-21)
- Передача данных вне ЕС
- Меры безопасности

### 5. Privacy by Design
Описывает:
- Принципы защиты данных
- Техническая реализация
- Процедуры безопасности

### 6. Права пользователей
Описывает:
- Как реализовать свои права
- Временные рамки
- Контакты DPO

### 7. Отказ от ответственности
Описывает:
- Природа платформы
- Риск сделок
- Интеллектуальная собственность

## Использование

### API
```bash
curl https://api.beldomik.by/api/v1/legal/privacy-policy
```

### Frontend
Открыть страницу с документами:
```
https://beldomik.app/legal?doc=privacy-policy
```

## Обновление документов

1. Отредактируйте `backend/app/api/routes/legal.py`
2. Обновите дату `last_updated` в каждом документе
3. Проверьте backend: `python -m py_compile backend/app/api/routes/legal.py`
4. Проверьте frontend: `npx tsc --noEmit --skipLibCheck`

## Контакты

- Поддержка: support@beldomik.by
- DPO: dpo@beldomik.by
- Telegram: @beldomik_support
