# Frontend vs Backend API Gap Analysis

Дата: 2026-03-24

## Что сравнивал

- frontend: текущий UI/state и места, где уже зашиты ожидания к данным и операциям
- backend code: контроллеры, DTO, request-модели, domain entities, service interfaces
- docs: `docs/openapi.yaml`, `docs/asyncapi.yaml`, `docs/agents/API_ARCHITECTURE.md`, `docs/agents/SERVICES_ARCHITECTURE.md`

Важно: backend-контроллеры в основном моковые. Ниже анализируется не текущий mock-ответ, а целевой контракт и уже заложенная архитектура.

## Короткий вывод

- Frontend сейчас почти не интегрирован с реальным API и по сути задаёт желаемую UX-модель.
- Backend/docs задают другую модель: `login/password`, дерево папок отдельно от файлов, бинарное хранение файлов, чат через `REST + SignalR`, rollback через `actionId`.
- ~~Главные блокеры интеграции: auth/profile, модель папок и файлов, mixed ordering в папке, чатовый transport, AI settings.~~

## Основные расхождения

| Область | Что ожидает frontend | Что есть в backend/docs | Рекомендация | Статус |
|---|---|---|---|---|
| Auth и профиль | `email + password` для login, `name + email + password` для register, локальный `user { email, name }` | `POST /api/auth/register` и `POST /api/auth/login` принимают `login/password`; `GET /api/auth/me` возвращает `id` и `login` | Менять frontend: использовать поле `login` вместо `email`, не зависеть от `name` | ✅ Backend: `UserDto` расширен полем `login`. Остаётся frontend |
| Системная папка | Frontend не закладывает special-case папки и работает с обычной пользовательской иерархией | Концепция системной папки `Inbox` убрана из backend/docs | — | ✅ Решено: Inbox удалён из кода и документации |
| Folder DTO | Frontend работает с рекурсивным объектом папки: `subfolders`, `emoji`, `prompt`, `customOrder` | В backend есть `description`, `parentFolderId`, `sortOrder`, `fileCount`, `hasChildren`, `path`, `emoji` | `prompt` → использовать `description`. `emoji` добавлен. `customOrder` реализован через `sortOrder` у файлов и папок | ✅ Backend: `emoji` добавлен. Остаётся frontend mapping |
| Mixed ordering в папке | Frontend хранит `folder.customOrder` и сортирует одним списком и подпапки, и файлы | Backend: файлы и папки разделяют общее пространство `sortOrder` внутри родительской папки; есть `PATCH /api/files/{fileId}/reorder` | Frontend интерливит файлы и папки по `sortOrder` | ✅ Backend: `SortOrder` добавлен в `File`, endpoint `reorder` создан. Остаётся frontend |
| Загрузка данных папки | Frontend держит весь tree и все files в памяти, выбранная папка уже содержит всё нужное для рендера | docs рекомендуют: полное дерево папок отдельно, файлы папки отдельно и пагинируемо | Менять frontend. Подход backend лучше масштабируется. Tree endpoint обогащён метаданными (`emoji`) | 🔄 Frontend |
| Модель файла | Frontend ожидает `type: text/photo/pdf`, `content`, `imageUrl/pdfUrl`, `prompt`, `createdAt` | Backend отдаёт metadata (`contentType`, `sizeBytes`, `sortOrder`, `createdAt`, ...), контент забирается отдельно через `/api/files/{fileId}/content` | Frontend маппит `contentType → UI type` и загружает content отдельно | ✅ Backend: `createdAt` и `sortOrder` добавлены. Остаётся frontend mapping |
| Редактирование текстовых файлов | Frontend автосохраняет текст каждые ~800 мс и на blur | Backend: `PUT /api/files/{fileId}/content` для бинарной замены; `PATCH /api/files/{fileId}/content` для лёгкого обновления текста через JSON body | Frontend использует PATCH для текстовых файлов, PUT для бинарных | ✅ Backend: `PATCH` endpoint добавлен. Остаётся frontend |
| Prompt у папок и файлов | Frontend явно редактирует AI instructions у folder и file | Backend имеет только `description` у folder/file; именно описание уже планируется использовать при prompt preparation | Менять frontend/API mapping: назвать это в интеграции `description` | 🔄 Frontend |
| Chat send flow | Frontend вызывает `onSend(text, attachments: File[])` и сразу хранит файлы в сообщении | Backend/docs требуют staging: сначала `POST /api/chat/attachments`, потом `ChatHub.SendMessage(content, attachmentIds, context)` | Менять frontend | 🔄 Frontend |
| Real-time transport | Frontend сейчас вообще не работает через SignalR | Backend целенаправленно строит AI flow через `ChatHub` и streaming events | Менять frontend | 🔄 Frontend |
| Chat message model | Frontend имеет только `user/system`, а кнопка `Undo` живёт прямо внутри system message | Backend разделяет `ChatMessageDto`, progress events и action-based rollback; undo привязан к `ActionId` | Менять frontend. Undo привязать к завершённой AI operation/action | 🔄 Frontend |
| Settings | Frontend ожидает `provider`, `modelId`, `apiKey`, экран смены ключа, текущий email, кнопку смены пароля | Backend/docs: `baseUrl`, `apiKey`, `provider`, `modelId` и `test connection`; пароля/профиля нет | Кнопку смены пароля на frontend пока убрать/disabled. Email → `login` | ✅ Backend: `provider` (enum `AiProvider`: OpenAI, OpenRouter, Gemini) и `modelId` добавлены. Frontend должен отправлять значение из enum. Остаётся frontend |
| Удаление папки | Frontend удаляет папку как "удалить всё содержимое" по умолчанию | Backend `DELETE /api/folders/{id}` по умолчанию non-recursive, recursive удаление отдельным флагом | Менять frontend. UI должен спрашивать тип удаления | 🔄 Frontend |
| Ограничения move/delete | Frontend свободно перекладывает папки и файлы в UI | Backend уже планирует проверки: name uniqueness, cycle prevention | Менять frontend: optimistic UI должен ожидать server-side reject | 🔄 Frontend |
