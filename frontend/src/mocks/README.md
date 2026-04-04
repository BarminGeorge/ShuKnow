# Mock Service Worker (MSW) Setup

Эта директория содержит моки для разработки и тестирования без реального backend.

## Структура

```
src/mocks/
├── browser.ts          # MSW worker для браузера
├── server.ts           # MSW server для тестов
├── handlers/           # HTTP handlers по доменам
│   ├── index.ts        # Собирает все handlers
│   ├── auth.ts         # Auth endpoints (login, register, me)
│   ├── folders.ts      # Folder CRUD endpoints
│   └── files.ts        # File CRUD endpoints
└── data/               # Моковые данные
    ├── index.ts        # Реэкспорт
    ├── auth.ts         # Mock user data
    ├── folders.ts      # MOCK_FOLDERS
    └── files.ts        # MOCK_FILES
```

## Как работает

MSW перехватывает HTTP запросы на уровне Service Worker в браузере и возвращает моковые данные вместо реальных ответов от backend.

**Mock режим (VITE_USE_MOCKS=true):**
```
Приложение → fetch() → [MSW Worker] → Mock данные
```

**Production режим (VITE_USE_MOCKS=false):**
```
Приложение → fetch() → [Vite Proxy] → Backend API
```

## Переключение режимов

Используйте переменную окружения `VITE_USE_MOCKS`:

- `VITE_USE_MOCKS=true` - Mock режим (по умолчанию для разработки)
- `VITE_USE_MOCKS=false` - Production режим (реальный backend)

### NPM скрипты

```bash
# Разработка с моками (по умолчанию)
npm run dev

# Разработка с моками (явно)
npm run dev:mock

# Разработка с реальным API
npm run dev:real

# Production сборка (без моков)
npm run build:prod

# Development сборка (с моками)
npm run build:mock
```

## Добавление новых моков

1. **Добавить данные** в `data/` (например, `data/chat.ts`)
2. **Создать handlers** в `handlers/` (например, `handlers/chat.ts`)
3. **Экспортировать** из `handlers/index.ts`:
   ```typescript
   import { chatHandlers } from './chat';
   
   export const handlers = [
     ...authHandlers,
     ...folderHandlers,
     ...fileHandlers,
     ...chatHandlers, // добавить новые handlers
   ];
   ```

## Важно

- Код приложения **НЕ знает** о моках - всегда делает обычные `fetch()` запросы
- MSW автоматически перехватывает запросы в mock режиме
- В production режиме MSW не запускается, запросы идут на реальный backend
- Тесты всегда используют моки через `src/test/setup.ts`
