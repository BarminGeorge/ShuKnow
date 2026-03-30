# Frontend vs Backend API Gap Analysis

Дата: 2026-03-24 | Последняя проверка: 2026-03-30

## Что сравнивал

- frontend (`main`): API-слой (`frontend/src/api/`), UI-компоненты, SignalR-клиент
- backend (`72-backend-fixes`): контроллеры, DTO, request-модели, domain entities, service interfaces
- docs: `docs/openapi.yaml`, `docs/asyncapi.yaml`, `docs/agents/API_ARCHITECTURE.md`, `docs/agents/SERVICES_ARCHITECTURE.md`

## Короткий вывод

- ~~Frontend сейчас почти не интегрирован с реальным API и по сути задаёт желаемую UX-модель.~~
- Frontend имеет полноценный API-слой (`types.ts`, `folderService.ts`, `fileService.ts`, `chatService.ts`, `chatHub.ts`, `settingsService.ts`, `actionsService.ts`) и SignalR-клиент.
- ~~Главные блокеры интеграции: auth/profile, модель папок и файлов, mixed ordering в папке, чатовый transport, AI settings.~~
- Основные контракты сведены. Остались точечные расхождения в типах и несколько отсутствующих маппингов на frontend.

## Основные расхождения

| Область | Что ожидает frontend | Что есть в backend/docs | Статус | Остаток |
|---|---|---|---|---|
| Auth и профиль | `login + password` для login/register, `user { id, login }` | `POST /api/auth/register` и `POST /api/auth/login` принимают `login/password`; `GET /api/auth/me` возвращает `{ id, login }` | ✅ Закрыто | — |
| Системная папка | Frontend не закладывает special-case папки | Концепция `Inbox` убрана из backend/docs | ✅ Закрыто | — |
| Folder DTO — `emoji` | UI-компоненты рендерят `emoji`, `CreateFolderRequest`/`UpdateFolderRequest` должны его передавать | Backend: `FolderDto`, `FolderTreeNodeDto`, `CreateFolderRequest`, `UpdateFolderRequest` — все имеют `emoji?` | ⚠️ Контракт готов, маппинг нет | Frontend `types.ts`: `FolderTreeNodeDto`, `FolderDto`, `Folder`, `CreateFolderRequest`, `UpdateFolderRequest` **не содержат** `emoji`. `mapFolderTreeNodeToFolder()` его не маппит |
| Folder DTO — `description` | Frontend использует `description` | Backend: `description` в Folder entity и DTO | ✅ Закрыто | — |
| Mixed ordering | Frontend интерливит папки и файлы по `sortOrder` | Backend: `SortOrder` у `File` и `Folder` (оба `IOrderedItem`); `PATCH /api/files/{fileId}/reorder`, `PATCH /api/folders/{folderId}/reorder` | ⚠️ Контракт готов, маппинг нет | Frontend `fileService.ts` **не имеет** функции `reorderFile`. `types.ts` не содержит `ReorderFileRequest` |
| Загрузка данных папки | Frontend: дерево через `/api/folders/tree`, файлы пагинированно через `/api/folders/{id}/files` | Backend: те же endpoints | ✅ Закрыто | — |
| Модель файла | Frontend: `FileItem { contentType, sizeBytes, contentUrl }`, `getFileDisplayType()` маппит MIME → UI type | Backend: `FileDto { ContentType, SizeBytes, CreatedAt, SortOrder, ... }`, контент через `/api/files/{fileId}/content` | ⚠️ Контракт готов, маппинг нет | Frontend `types.ts` `FileDto` **не содержит** `createdAt` и `sortOrder`. `mapFileDtoToFileItem()` их не маппит |
| Текстовый autosave | Frontend `updateFileContent()` использует `PUT` + `multipart/form-data` | Backend: `PUT` для бинарной замены; `PATCH /api/files/{fileId}/content` для лёгкого обновления текста через JSON `{ content }` | ⚠️ Контракт готов, frontend не использует | Frontend `fileService.ts` **не имеет** функции для `PATCH` text content. Autosave пойдёт через тяжёлый `PUT` вместо лёгкого `PATCH` |
| Prompt у папок и файлов | Frontend использует `description` в API-слое, в UI подписывает как «Описание / Инструкция для ИИ» | Backend: `description` в entity и DTO | ✅ Закрыто | Семантически совпадает |
| Chat send flow | Frontend: staging через `chatService.uploadChatAttachments()` → ID → `ChatHub.SendMessage(content, attachmentIds, context)` | Backend: `POST /api/chat/attachments` → `ChatHub.SendMessage` | ✅ Закрыто | — |
| Real-time transport | Frontend: полноценный SignalR-клиент (`chatHub.ts`, `useChatHub.ts`) | Backend: `ChatHub` со streaming events | ✅ Закрыто | — |
| Chat message model | Frontend API: `ChatMessageDto { role: "User" \| "Ai" }`, `useChatHub` отслеживает `lastActionId` | Backend: `ChatMessageDto`, progress events, `ActionId` | ⚠️ Частично | UI-компонент `ChatMessages.tsx` ещё использует упрощённую модель `user/system`; нужна интеграция с `useChatHub` |
| Settings — provider enum | Frontend: `AiProvider = "unknown" \| "openai" \| "openrouter" \| "gemini" \| "anthropic"` | Backend: `CaseInsensitiveJsonStringEnumConverter` → `"unknown"`, `"openai"`, `"openrouter"`, `"gemini"`, `"anthropic"` | ✅ Закрыто | Enum синхронизирован: `Unknown, OpenAI, OpenRouter, Gemini, Anthropic`. Backend сериализует lowercase и парсит case-insensitively. `custom` удалён |
| Settings — остальное | Frontend: `baseUrl`, `apiKey`, `modelId`, `apiKeyMasked`, `isConfigured`, test connection | Backend: `AiSettingsDto { BaseUrl, ApiKeyMasked, Provider?, ModelId?, IsConfigured }`, `POST .../test` | ✅ Закрыто | — |
| Удаление папки | Frontend: `deleteFolder(id, recursive)` шлёт `?recursive=true` | Backend: `DELETE /api/folders/{id}?recursive=false` принимает `[FromQuery] bool recursive` | ✅ Закрыто | Backend `DeleteFolder` принимает `[FromQuery] bool recursive = false` |
| Ограничения move/delete | Frontend: optimistic UI без обработки server reject | Backend: планируется name uniqueness, cycle prevention | 🔄 Доработка | Frontend должен обрабатывать 409/422 и откатывать optimistic state |
