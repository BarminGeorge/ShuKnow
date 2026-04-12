# Frontend vs Backend API Gap Analysis

Дата: 2026-04-06 | Последняя проверка: 2026-04-06

## Что сравнивал

- frontend (`main`): API-слой (`frontend/src/api/`), UI-компоненты, SignalR-клиент
- backend (`66-aiservice`): контроллеры, DTO, request-модели, domain entities, service interfaces и новый Tornado AI flow
- docs: `docs/openapi.yaml`, `docs/asyncapi.yaml`, `docs/agents/API_ARCHITECTURE.md`, `docs/agents/SERVICES_ARCHITECTURE.md`

## Короткий вывод

- REST-контракты на этой ветке почти не изменились относительно `main`.
- Главное изменение ветки находится во внутреннем AI runtime: orchestration/parser pipeline удалён и заменён Tornado-based conversation + tools path.
- Публичный SignalR-контракт в `asyncapi.yaml` сохранён, но реальный `ChatHub` по-прежнему остаётся stub-ом и не подключён к новому `IAiService`.
- Ветка добавляет новые backend-only порты (`IAiToolsService`, `ITextFileService`, path-based file/folder operations), но они пока не реализованы полностью и не влияют на внешний REST-контракт.

## Основные расхождения

| Область | Что ожидает frontend | Что есть в backend/docs | Статус | Остаток |
|---|---|---|---|---|
| Auth и профиль | `login + password` для login/register, `user { id, login }` | `POST /api/auth/register` и `POST /api/auth/login` принимают `login/password`; `GET /api/auth/me` возвращает `{ id, login }` | ✅ Закрыто | — |
| Folder DTO — `emoji` | UI-компоненты рендерят `emoji`, `CreateFolderRequest`/`UpdateFolderRequest` должны его передавать | Backend и docs сохраняют `emoji?` в DTO и request-моделях | ⚠️ Контракт готов, маппинг нет | Frontend `types.ts` и маппинг папок всё ещё должны быть синхронизированы с `emoji` |
| Mixed ordering | Frontend интерливит папки и файлы по `sortOrder` | Backend/docs: `SortOrder` у `File` и `Folder`, есть file/folder reorder endpoints | ⚠️ Контракт готов, маппинг нет | Frontend API-слой всё ещё должен явно закрыть `reorderFile` и типы для этого |
| Модель файла | Frontend использует `contentType`, `sizeBytes`, `contentUrl` и UI-type mapping | Backend/docs: `FileDto` также содержит `createdAt` и `sortOrder`; контент идёт через `/api/files/{fileId}/content` | ⚠️ Контракт готов, маппинг нет | Frontend DTO и mapping остаются неполными по `createdAt` и `sortOrder` |
| Текстовый autosave | Frontend `updateFileContent()` использует тяжёлый `PUT multipart/form-data` | Backend/docs: есть лёгкий `PATCH /api/files/{fileId}/content` для JSON text update | ⚠️ Контракт готов, frontend не использует | Frontend всё ещё может перейти на лёгкий `PATCH` для текстовых файлов |
| Chat send flow | Frontend: staging через `uploadChatAttachments()` → IDs → `ChatHub.SendMessage(...)` | Docs: SignalR-контракт тот же; backend branch: `ChatHub.SendMessage` всё ещё TODO, новый AI runtime живёт отдельно в `TornadoAiService.ProcessMessageAsync()` | ⚠️ Контракт есть, runtime wiring нет | Frontend готов к хабу, но backend ветки пока не вызывает новый AI-path из `ChatHub` |
| Real-time transport | Frontend: полноценный SignalR-клиент (`chatHub.ts`, `useChatHub.ts`) со streaming/progress events | AsyncAPI: те же streaming/progress events; backend branch: `ChatHub` отправляет placeholder events и не стримит новый AI flow | ⚠️ Контракт есть, реализация отстаёт | `OnMessageChunk`, `OnClassificationResult`, `OnFileCreated`, `OnFolderCreated`, `OnProcessingCompleted` пока не привязаны к новой AI-реализации |
| Chat message model | Frontend API: `ChatMessageDto { role: "User" | "Ai" }`, SignalR flow ожидает историю и live events | Backend branch: `IChatService` перешёл на единый `PersistMessageAsync()` и добавил non-paginated `GetMessagesAsync(ct)` для AI conversation history | ✅ Закрыто на контрактном уровне | Внешний DTO не менялся, но внутренняя chat-модель branch-specific и её стоит учитывать в backend docs |
| Settings — provider enum | Frontend: `unknown | openai | openrouter | gemini | anthropic` | Backend: enum синхронизирован, сериализация lowercase, parsing case-insensitive | ✅ Закрыто | — |
| Settings — test connection | Frontend ожидает `baseUrl`, `apiKey`, `modelId`, `apiKeyMasked`, `isConfigured` и test connection | Backend: тот же внешний контракт; branch detail: test now uses Tornado conversation round-trip and persists nullable latency on failure | ✅ Закрыто | Внешний контракт не изменился, изменилась только внутренняя реализация |
| AI runtime internals | Frontend ожидает, что backend выполнит long-running AI workflow за SignalR-контрактом | Backend branch: orchestration/parser pipeline удалён; вместо него появились `TornadoAiService`, `TornadoPromptBuilder`, `TornadoToolsService` | 🔄 Внутренний рефакторинг | Внешний контракт тот же, но docs должны явно фиксировать новый runtime shape и разрыв с текущим `ChatHub` |
| AI tools backend | Frontend напрямую этого не видит | Backend branch: добавлен `IAiToolsService` и tool registry в `TornadoToolsService` | ⚠️ Backend gap | Нет реализации и DI-регистрации `IAiToolsService`, поэтому новый AI-path пока неполон |
| Path-based AI file ops | Frontend напрямую этого не видит | Backend branch: добавлены `IFileService.GetByPathAsync()`, `IFolderService.GetByPathAsync()`, `IFolderService.CreateByPathAsync()`, `ITextFileService` | ⚠️ Backend gap | Эти методы и сервис пока не реализованы, поэтому tool-driven path operations остаются TODO |
| Ограничения move/delete | Frontend: optimistic UI без полной обработки server reject | Backend: инварианты по уникальности имён и предотвращению циклов по-прежнему ожидаются | 🔄 Доработка | Frontend должен корректно обрабатывать `409/422`, независимо от внутреннего AI-рефакторинга |

## Что важно зафиксировать в docs

1. `docs/agents/API_ARCHITECTURE.md` должен описывать именно текущий Tornado-based AI flow, а не старый orchestration/parser pipeline.
2. `docs/agents/SERVICES_ARCHITECTURE.md` должен фиксировать новый контракт `IAiService`, появление `IAiToolsService` и `ITextFileService`, а также branch gaps по DI и не реализованным path-based методам.
3. `docs/asyncapi.yaml` по-прежнему можно считать intended contract, но не описанием реально работающего runtime на этой ветке.
4. Для внешнего API ветка почти нейтральна; основной documentation delta находится во внутренних service/runtime docs.
