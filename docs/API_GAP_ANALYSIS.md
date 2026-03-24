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
- Главные блокеры интеграции: auth/profile, модель папок и файлов, mixed ordering в папке, чатовый transport, AI settings.

## Основные расхождения

| Область | Что ожидает frontend | Что есть в backend/docs | Рекомендация |
|---|---|---|---|
| Auth и профиль | `email + password` для login, `name + email + password` для register, локальный `user { email, name }` | `POST /api/auth/register` и `POST /api/auth/login` принимают `login/password`; `GET /api/auth/me` возвращает только `id`; профиля с `name/email` нет | Краткосрочно проще менять frontend: использовать поле `login` вместо `email`, не зависеть от `name`. Если имя/email нужны как часть продукта, тогда это уже осмысленное расширение backend domain и auth contract |
| Системная папка | Frontend не закладывает special-case папки и работает с обычной пользовательской иерархией | docs/services требуют авто-создание `Inbox`; docs/openapi запрещают его удалять | Здесь логичнее менять backend/docs: убрать концепцию системной папки для MVP. Текущая frontend-модель проще, а special-case `Inbox` добавляет лишние ветки в delete/move/rename и усложняет интеграцию без явной пользы |
| Folder DTO | Frontend работает с рекурсивным объектом папки: `subfolders`, `emoji`, `prompt`, `customOrder` | В backend есть `description`, `parentFolderId`, `sortOrder`, `fileCount`, `hasChildren`, `path`; `emoji`, `prompt`, `customOrder` отсутствуют | `prompt` логично не дублировать: использовать backend `description` как каноническое поле. `emoji` стоит добавить на backend, если иконка должна жить между сессиями/устройствами. `customOrder` требует отдельного решения, см. ниже |
| Mixed ordering в папке | Frontend хранит `folder.customOrder` и сортирует одним списком и подпапки, и файлы | Backend архитектурно разделяет folder tree и paged files; reorder есть только для папок, для файлов внутри папки порядка нет | Это лучше менять на backend, если текущий UX важен. Для сохранения drag-and-drop/grid UX нужен общий порядок children внутри папки, а не только `Folder.SortOrder` |
| Загрузка данных папки | Frontend держит весь tree и все files в памяти, выбранная папка уже содержит всё нужное для рендера | docs рекомендуют: полное дерево папок отдельно, файлы папки отдельно и пагинируемо | Менять frontend. Подход backend лучше масштабируется. Но backend tree endpoint стоит обогатить метаданными, нужными UI, чтобы избежать каскада дополнительных запросов |
| Модель файла | Frontend ожидает `type: text/photo/pdf`, `content`, `imageUrl/pdfUrl`, `prompt`, `createdAt` | Backend отдаёт metadata (`contentType`, `sizeBytes`, ...), контент забирается отдельно через `/api/files/{fileId}/content`; полей `prompt` и `createdAt` нет | Не тянуть inline blob/url в `FileDto`. Frontend должен маппить `contentType -> UI type` и загружать content отдельно. Backend желательно расширить `FileDto` как минимум `createdAt`, а для text-note UX дать более удобное обновление контента |
| Редактирование текстовых файлов | Frontend автосохраняет текст каждые ~800 мс и на blur | Backend `PUT /api/files/{fileId}/content` спроектирован как замена бинарного файла через `multipart/form-data` | Это лучше доработать на backend: для заметок нужен лёгкий способ обновлять текст (`text/plain`, `text/markdown` или JSON body), иначе autosave будет тяжёлым и неудобным |
| Prompt у папок и файлов | Frontend явно редактирует AI instructions у folder и file | Backend имеет только `description` у folder/file; именно описание уже планируется использовать при prompt preparation | Менять преимущественно frontend/API mapping: назвать это в интеграции `description` и не плодить отдельное поле `prompt`, пока не появится реальная разница в семантике |
| Chat send flow | Frontend вызывает `onSend(text, attachments: File[])` и сразу хранит файлы в сообщении | Backend/docs требуют staging: сначала `POST /api/chat/attachments`, потом `ChatHub.SendMessage(content, attachmentIds, context)` | Менять frontend. Это архитектурно правильнее, и docs прямо обосновывают отказ от binary через SignalR |
| Real-time transport | Frontend сейчас вообще не работает через SignalR | Backend целенаправленно строит AI flow через `ChatHub` и streaming events | Менять frontend. Для этого сценария backend-подход правильнее, чем пытаться увести всё в обычный REST |
| Chat message model | Frontend имеет только `user/system`, а кнопка `Undo` живёт прямо внутри system message | Backend разделяет `ChatMessageDto`, progress events и action-based rollback; undo привязан к `ActionId`, который приходит после completion | Менять frontend. Undo должен быть привязан не к “левому сообщению”, а к завершённой AI operation/action |
| Settings | Frontend ожидает `provider`, `modelId`, `apiKey`, экран смены ключа, текущий email, кнопку смены пароля | Backend/docs пока имеют только `baseUrl + apiKey` и `test connection`; пароля/профиля нет | `provider` лучше добавить на backend как enum. `modelId` тоже лучше добавить: без него конфиг LLM неполный. Кнопку смены пароля на frontend пока лучше убрать/disabled |
| Удаление папки | Frontend удаляет папку как “удалить всё содержимое” по умолчанию | Backend `DELETE /api/folders/{id}` по умолчанию non-recursive, recursive удаление отдельным флагом | Менять frontend. Поведение backend безопаснее. UI должен либо спрашивать тип удаления, либо вызывать `recursive=true` осознанно |
| Ограничения move/delete | Frontend свободно перекладывает папки и файлы в UI | Backend уже планирует проверки: name uniqueness, cycle prevention | Менять frontend: optimistic UI должен ожидать server-side reject и уметь откатываться |
