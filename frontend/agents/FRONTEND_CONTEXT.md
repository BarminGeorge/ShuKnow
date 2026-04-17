# ShuKnow Frontend Context

Этот файл предназначен для RAG/agent-подсказок. Используй его как краткую карту фронтенда перед изменениями в `frontend`.

## Назначение

ShuKnow frontend - React-приложение для сохранения, сортировки и редактирования учебных/личных материалов. Основной пользовательский сценарий:

1. пользователь заходит или регистрируется;
2. открывает рабочую область `/app`;
3. отправляет сообщение и вложения AI-ассистенту;
4. ассистент через backend классифицирует/создает/перемещает файлы и папки;
5. пользователь смотрит дерево папок, файлы, вкладки и редактор.

## Технологии

- React 18, TypeScript, Vite.
- Routing: `react-router`.
- State management: Jotai.
- Styling: Tailwind CSS 4, локальные CSS-файлы в `src/styles`.
- UI primitives: Radix UI, shadcn-like компоненты в `src/app/components/ui`.
- Icons: `lucide-react`, частично MUI icons.
- Realtime: `@microsoft/signalr`.
- Drag and drop: `react-dnd` + `react-dnd-html5-backend`.
- Editor: CodeMirror (`@uiw/react-codemirror`) + markdown preview (`react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`).
- Tests: Vitest, Testing Library, jsdom, MSW.

## Команды

Запускать из папки `frontend`.

- `npm run dev` - dev-сервер с моками, если `VITE_USE_MOCKS=true`.
- `npm run dev:mock` - явно запустить mock-режим.
- `npm run dev:real` - запустить с реальным API через Vite proxy.
- `npm run build` - production build.
- `npm run build:mock` - build в development mode с моками.
- `npm run build:prod` - build в production mode.
- `npm run test` - Vitest watch.
- `npm run test:run` - одноразовый прогон тестов.
- `npm run test:coverage` - покрытие.

## Переменные и окружение

- `VITE_USE_MOCKS=true` включает MSW в `src/main.tsx`.
- `VITE_USE_MOCKS=false` отключает MSW; Vite проксирует `/api` на `http://localhost:5209`.
- JWT хранится в `localStorage` по ключу `shuknow_auth_token`.
- Данные пользователя хранятся в `localStorage` по ключу `shuknow_user`.
- SignalR hub: `/hubs/chat`.

## Маршруты

Файл входа: `src/main.tsx`.
Корневое приложение: `src/app/App.tsx`.

- `/` -> `LandingPage`.
- `/login` -> `LoginPage`.
- `/register` -> `RegisterPage`.
- `/app` -> `ProtectedRoute` + `ErrorBoundary` + `Workspace`.

`AuthProvider` оборачивает приложение и отвечает за `login`, `register`, `logout`, чтение/запись токена и пользователя.

## Главные зоны приложения

### Workspace

`src/app/Workspace.tsx` - центральный контейнер рабочей области.

Он связывает:

- левый `Sidebar`;
- глобальную строку вкладок `TabBar`;
- чат `ChatMessages` + `InputConsole`;
- просмотр папки `FolderContentView`;
- редактор файлов `TabsWorkspace`;
- SignalR-события через `useChatHub`;
- состояние папок, файлов, вкладок и текущего режима через Jotai hooks.

Режимы отображения:

- `chat` - стартовый чат с AI;
- `folder` - содержимое выбранной папки;
- `editor` - редактор активного файла.

### Папки и файлы

Основные файлы:

- `src/app/components/Sidebar.tsx` - навигация по папкам.
- `src/app/components/FolderItem.tsx` - элемент дерева папок.
- `src/app/components/FolderContentView.tsx` - контейнер просмотра папки.
- `src/app/components/FolderContentView/` - новая модульная структура для grid, drag layer, upload zone, helpers, hooks и tests.
- `src/app/components/CreateFolderModal.tsx`, `EditFolderModal.tsx`, `DeleteFolderModal.tsx` - операции с папками.
- `src/app/components/CreateFileModal.tsx`, `CreatePhotoModal.tsx`, `EditFileModal.tsx` - операции с файлами.
- `src/app/components/FileContextMenu.tsx`, `FolderContextMenu.tsx` - контекстные меню.

Папки представлены типом `Folder` из `src/api/types.ts`:

- `id`, `name`, `description`, `sortOrder`, `fileCount`, `subfolders`;
- UI-опционально: `emoji`, `prompt`, `customOrder`.

Файлы представлены типом `FileItem`:

- `id`, `name`, `folderId`, `description`, `contentType`, `sizeBytes`;
- UI-опционально: `content`, `contentUrl`, `type`, `createdAt`, `sortOrder`.

### Редактор и вкладки

Основные файлы:

- `src/app/components/workspace/TabBar.tsx` - верхняя панель вкладок и навигации.
- `src/app/components/workspace/TabsWorkspace.tsx` - область редактора.
- `src/app/components/workspace/EditorPane.tsx` - CodeMirror/preview для файлов.

`EditorPane` поддерживает подсветку и preview для текстовых/кодовых/markdown-файлов. Для определения расширений и ограничений использует `src/app/utils/fileValidation.ts`.

### Чат и AI-поток

Основные файлы:

- `src/app/components/ChatMessages.tsx` - список сообщений, статусы обработки, результаты, retry/undo UI.
- `src/app/components/InputConsole.tsx` - ввод сообщения и вложений.
- `src/api/chatService.ts` - HTTP API для chat session, messages и upload attachments.
- `src/api/chatHub.ts` - SignalR клиент.
- `src/app/hooks/useChatHub.ts` - React hook поверх SignalR клиента.

В real mode отправка сообщения работает так:

1. `Workspace.handleSendMessageReal` добавляет user-message со статусом `sending`.
2. Вложения загружаются через `chatService.uploadChatAttachments`.
3. Команда отправляется в SignalR методом `SendMessage`.
4. Backend присылает события:
   - `OnProcessingStarted`;
   - `OnMessageChunk`;
   - `OnMessageCompleted`;
   - `OnClassificationResult`;
   - `OnFileCreated`;
   - `OnFileMoved`;
   - `OnFolderCreated`;
   - `OnProcessingCompleted`;
   - `OnProcessingFailed`;
   - `OnProcessingCancelled`.
5. `Workspace` обновляет сообщения, результат операции и перезагружает папки через `loadFolders`.

В mock mode SignalR не подключается; `Workspace.handleSendMessageMock` имитирует обработку через таймеры.

## Состояние

Jotai store находится в `src/app/store`.

- `atoms.ts` - базовые атомы:
  - `viewModeAtom`;
  - `isSidebarCollapsedAtom`;
  - `foldersAtom`;
  - `isLoadingFoldersAtom`;
  - `selectedFolderPathAtom`;
  - `filesAtom`;
  - `openTabIdsAtom`;
  - `activeTabIdAtom`;
  - `messagesAtom`;
  - `currentTitleAtom`.
- `actions.ts` - write-only atoms для загрузки/изменения папок, файлов, вкладок и сообщений.
- `selectors.ts` - вычисляемые значения.
- `index.ts` - публичный реэкспорт store.

Hooks в `src/app/hooks` скрывают детали Jotai:

- `useFolders`;
- `useFiles`;
- `useTabs`;
- `useWorkspaceView`;
- `useChat`;
- `useChatHub`.

При изменениях сначала ищи существующий hook/action atom, а не добавляй локальный `useState` в глубине компонента.

## API слой

API находится в `src/api`.

- `client.ts` - `apiRequest`, работа с auth token, `ApiError`.
- `types.ts` - DTO, UI-типы и мапперы.
- `folderService.ts` - `/api/folders`.
- `fileService.ts` - `/api/folders/{id}/files`, `/api/files`.
- `chatService.ts` - `/api/chat`.
- `actionsService.ts` - `/api/actions` и rollback.
- `settingsService.ts` - `/api/settings/ai`.
- `chatHub.ts` - `/hubs/chat`.
- `index.ts` - публичный реэкспорт.

Для JSON-запросов используй `apiRequest`. Для multipart upload используй прямой `fetch` с `Authorization` из `getAuthToken`; не выставляй `Content-Type` вручную для `FormData`.

## Backend-контракты

OpenAPI/AsyncAPI документация лежит на уровне репозитория:

- `docs/openapi.yaml`;
- `docs/asyncapi.yaml`;
- `docs/API_ARCHITECTURE.md`;
- `docs/SERVICES_ARCHITECTURE.md`.

При изменении frontend API сначала сверяйся с этими файлами и backend контроллерами в `backend/ShuKnow.WebAPI/Controllers`.

## Моки и тесты

MSW находится в `src/mocks`.

- `browser.ts` - worker для браузера.
- `server.ts` - server для тестов.
- `handlers/` - HTTP handlers по доменам.
- `data/` - моковые данные.

Тестовая настройка: `src/test/setup.ts`.
Утилиты тестов: `src/test/utils.tsx`.

Тесты лежат рядом с кодом в `__tests__`.
При изменении логики hooks/store/helpers добавляй или обновляй соответствующие unit tests.

## Структура папок

```text
frontend/
  agents/                      # RAG/context files for agents
  public/                      # static files and MSW worker
  src/
    api/                       # typed API clients and SignalR client
    app/
      App.tsx                  # routes and app providers
      Workspace.tsx            # main authenticated workspace
      components/              # UI/application components
      contexts/                # AuthContext
      hooks/                   # state and realtime hooks
      pages/                   # landing/login/register
      store/                   # Jotai atoms/actions/selectors
      utils/                   # frontend utilities
    constants/                 # app constants
    mocks/                     # MSW mocks
    styles/                    # global CSS and theme files
    test/                      # test setup/helpers
```

## Важные соглашения

- Большинство UI-текстов в рабочей области на русском.
- Не ломай mock mode: приложение должно работать без backend при `VITE_USE_MOCKS=true`.
- Для нового backend-запроса добавляй typed функцию в `src/api/*Service.ts`, а не делай `fetch` прямо в компоненте.
- Для общих UI-состояний используй Jotai store/hooks.
- Для drag/drop в папках используй существующие helpers/hooks из `FolderContentView`.
- Для toast уведомлений используется `sonner`.
- Для ошибок рабочей области есть `ErrorBoundary` и `WorkspaceErrorBoundary`.
- Не удаляй плагины React и Tailwind из `vite.config.ts`; в комментарии указано, что они обязательны.
- В `vite.config.ts` alias `@` указывает на `src`.
- Файлы `.css`, `.ts`, `.tsx` нельзя добавлять в `assetsInclude`.

## Быстрые точки входа для задач

- Изменить авторизацию: `src/app/contexts/AuthContext.tsx`, `src/app/components/ProtectedRoute.tsx`, `src/app/pages/LoginPage.tsx`, `src/app/pages/RegisterPage.tsx`, `src/api/client.ts`.
- Изменить дерево папок: `src/app/components/Sidebar.tsx`, `src/app/components/FolderItem.tsx`, `src/app/hooks/useFolders.ts`, `src/app/store/actions.ts`, `src/api/folderService.ts`.
- Изменить grid папки: `src/app/components/FolderContentView.tsx` и модуль `src/app/components/FolderContentView/`.
- Изменить upload файлов: `src/app/components/FolderContentView/hooks/useFileUpload.ts`, `src/api/fileService.ts`, `src/app/utils/fileValidation.ts`.
- Изменить чат: `src/app/components/ChatMessages.tsx`, `src/app/components/InputConsole.tsx`, `src/api/chatService.ts`, `src/api/chatHub.ts`, `src/app/hooks/useChatHub.ts`.
- Изменить AI settings: `src/app/components/SettingsModal.tsx`, `src/api/settingsService.ts`.
- Изменить вкладки/редактор: `src/app/components/workspace/TabBar.tsx`, `src/app/components/workspace/TabsWorkspace.tsx`, `src/app/components/workspace/EditorPane.tsx`, `src/app/hooks/useTabs.ts`.
- Изменить landing: `src/app/pages/LandingPage.tsx`, assets в `public/images/landing`.

## Проверка перед завершением изменений

Минимальный набор:

1. `npm run test:run`
2. `npm run build`

Если менялись моки, проверь `npm run dev:mock`.
Если менялся API или SignalR, проверь `npm run dev:real` вместе с backend на `http://localhost:5209`.
