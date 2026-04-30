# ShuKnow MVP — Архитектура БД

## Область действия

Документ отражает текущую persistence-модель backend-решения `backend/ShuKnow.sln`.

Источник истины:

- `backend/ShuKnow.Infrastructure/Persistent/AppDbContext.cs`
- `backend/ShuKnow.Infrastructure/Persistent/DbConfiguration/*.cs`
- `backend/ShuKnow.Infrastructure/Persistent/Repositories/*.cs`
- `backend/ShuKnow.Domain/Entities/*.cs`
- `backend/ShuKnow.Domain/Repositories/*.cs`

Persistence stack: EF Core 8, Npgsql/PostgreSQL, миграции в `ShuKnow.Infrastructure/Migrations`, application-level unit of work через `PostgresUnitOfWork`.

## DbContext

`AppDbContext` регистрирует следующие `DbSet`:

| DbSet | Таблица | Entity |
|---|---|---|
| `Users` | `users` | `User` |
| `IdentityUsers` | `identity_users` | `ShuKnow.Infrastructure.Misc.IdentityUser` |
| `Folders` | `folders` | `Folder` |
| `Files` | `files` | `File` |
| `ChatSessions` | `chat_sessions` | `ChatSession` |
| `ChatMessages` | `chat_messages` | `ChatMessage` |
| `ChatAttachments` | `chat_attachments` | `ChatAttachment` |
| `UserAiSettings` | `user_ai_settings` | `UserAiSettings` |

`OnModelCreating` применяет все `IEntityTypeConfiguration` из сборки Infrastructure.

## Таблицы

### `users`

Базовая user-запись приложения.

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `login` | `text` | Login пользователя. |

Связи:

- Principal для `identity_users`, `folders`, `chat_sessions`, `chat_attachments`, `user_ai_settings`.

### `identity_users`

Auth credentials для login/password flow.

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | `uuid` | Primary key и FK на `users.id`. |
| `login` | `text` | Уникальный login. |
| `password_hash` | `text` | Password hash. |

Ограничения и индексы:

- Unique index по `login`.
- One-to-one связь с `users`, cascade delete.

### `folders`

Иерархия пользовательских папок.

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | Владелец папки. |
| `parent_folder_id` | `uuid?` | Родительская папка; `null` означает root. |
| `name` | `varchar(256)` | Имя папки. |
| `description` | `text` | Описание. |
| `sort_order` | `integer` | Пользовательский порядок внутри parent. |
| `emoji` | `text?` | Опциональный visual marker. |

Ограничения и индексы:

- FK `user_id -> users.id`, cascade delete.
- Self-FK `parent_folder_id -> folders.id`, cascade delete.
- Index по `(user_id, parent_folder_id, sort_order)`.
- Index по `(user_id, parent_folder_id, name)`.

### `files`

Метаданные persistent files. Содержимое хранится во внешнем blob storage, а БД хранит `blob_id`.

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | Владелец файла. |
| `blob_id` | `uuid` | ID blob-объекта. |
| `folder_id` | `uuid?` | Папка; `null` означает root. |
| `name` | `text` | Имя файла. |
| `description` | `text` | Описание. |
| `content_type` | `text` | MIME type. |
| `size_bytes` | `bigint` | Размер контента. |
| `version` | `integer` | Версия метаданных/контента. |
| `checksum_sha256` | `text?` | Опциональная SHA-256 checksum. |
| `sort_order` | `integer` | Пользовательский порядок внутри folder. |
| `created_at` | `timestamp with time zone` | Время создания. |

Ограничения и индексы:

- FK `folder_id -> folders.id`.
- Index по `folder_id`.
- User ownership фильтруется repository-запросами через `user_id`.

### `chat_sessions`

Chat session пользователя.

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | Владелец session. |
| `status` | `integer` | `ChatSessionStatus` как int. |
| `created_at` | `timestamp with time zone` | Default `CURRENT_TIMESTAMP`. |
| `last_activity_at` | `timestamp with time zone` | Default `CURRENT_TIMESTAMP`; используется cleanup service. |

Ограничения и индексы:

- FK `user_id -> users.id`, cascade delete.
- Non-unique index по `user_id`.
- Index по `last_activity_at`.

### `chat_messages`

Сообщения внутри chat session.

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `session_id` | `uuid` | Chat session. |
| `role` | `integer` | `ChatMessageRole` как int. |
| `content` | `text` | Текст сообщения. |
| `created_at` | `timestamp with time zone` | Default `CURRENT_TIMESTAMP`. |

Ограничения и индексы:

- FK `session_id -> chat_sessions.id`, cascade delete.
- Index по `(session_id, created_at, id)` для stable cursor pagination.

### `chat_attachments`

Staged attachments для chat workflow до сохранения как persistent file.

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()`. |
| `blob_id` | `uuid` | ID blob-объекта. |
| `user_id` | `uuid` | Владелец attachment. |
| `file_name` | `varchar(255)` | Original filename. |
| `content_type` | `varchar(100)` | MIME type. |
| `size_bytes` | `bigint` | Размер blob. |
| `created_at` | `timestamp with time zone` | Default `CURRENT_TIMESTAMP`. |
| `is_consumed` | `boolean` | Attachment уже сохранён/использован. |

Ограничения и индексы:

- FK `user_id -> users.id`, cascade delete.
- Index по `user_id`.
- Index по `blob_id`.
- Index по `(created_at, is_consumed)` для cleanup expired unconsumed attachments.

### `user_ai_settings`

Per-user AI provider settings.

| Колонка | Тип | Назначение |
|---|---|---|
| `user_id` | `uuid` | Primary key и FK на `users.id`. |
| `base_url` | `text` | Provider base URL. |
| `api_key_encrypted` | `text` | Encrypted API key. |
| `provider` | `integer` | `AiProvider` как int. |
| `model_id` | `text` | Model identifier. |
| `last_test_success` | `boolean?` | Последний результат connection test. |
| `last_test_latency_ms` | `integer?` | Latency последнего test. |
| `last_test_error` | `text?` | Error последнего test. |

Ограничения и индексы:

- One-to-one связь с `users`, cascade delete.

## Repositories

Все repository interfaces возвращают `Ardalis.Result` и не вызывают `SaveChangesAsync` напрямую. Commit выполняется вызывающим application service через `IUnitOfWork`/`PostgresUnitOfWork`, когда сценарий требует сохранения.

| Interface | Реализация | Основная таблица | Статус |
|---|---|---|---|
| `IUserRepository` | `UserRepository` | `users` | Реализован. |
| `IIdentityUserRepository` | `IdentityUserRepository` | `identity_users` | Реализован в Infrastructure. |
| `IFolderRepository` | `FolderRepository` | `folders` | Реализован. |
| `IFileRepository` | `FileRepository` | `files` | Реализован. |
| `IChatSessionRepository` | `ChatSessionRepository` | `chat_sessions` | Реализован. |
| `IChatMessageRepository` | `ChatMessageRepository` | `chat_messages` | Реализован. |
| `IAttachmentRepository` | `AttachmentRepository` | `chat_attachments` | Реализован. |
| `ISettingsRepository` | `SettingsRepository` | `user_ai_settings` | Реализован. |
| `IActionRepository` | `ActionRepository` | Не подключено к `AppDbContext` | Placeholder; методы бросают `NotImplementedException`. |

### User/auth repositories

- `UserRepository.GetByIdAsync` читает `users` через `AsNoTracking`.
- `UserRepository.AddAsync` добавляет user в change tracker.
- `IdentityUserRepository.GetByLoginAsync` ищет credentials по login и возвращает `Unauthorized`, если запись не найдена.
- `IdentityUserRepository.ContainsLoginAsync` проверяет уникальность login.
- `IdentityUserRepository.AddAsync` добавляет credentials запись.

### Folder repository

`FolderRepository` всегда ограничивает read/write операции по `user_id`.

Основные операции:

- чтение папки по `(id, user_id)`;
- проверка существования папки;
- загрузка tree/list/root/children с сортировкой по `sort_order`, затем `name`;
- определение ancestors с защитой от циклов;
- проверка name conflict внутри parent;
- add/update/update range;
- delete/delete subtree через удаление root folder, полагаясь на cascade delete.

### File repository

`FileRepository` хранит только metadata и `blob_id`; blob content обрабатывается blob storage services.

Основные операции:

- чтение файла по `(id, user_id)` с `Folder` include;
- tracked read для update сценариев;
- paged list по folder;
- проверка name conflict внутри folder;
- add/update/update range;
- delete file или files by folder;
- user-wide и folder-specific списки;
- lookup по `(folder_id, user_id, file_name)`;
- выборка существующих `blob_id` для orphan cleanup.

### Chat repositories

`ChatSessionRepository`:

- читает session по `(id, user_id)`;
- добавляет session;
- удаляет session по id;
- bulk-delete sessions older than cutoff по `last_activity_at`.

`ChatMessageRepository`:

- добавляет одно или несколько сообщений;
- читает session history по `created_at`, затем `id`;
- отдаёт cursor-paged messages через base64 cursor вида `sessionId|createdAt|messageId`;
- считает сообщения в session;
- удаляет все сообщения session.

### Attachment repository

`AttachmentRepository`:

- читает staged attachment по `(id, user_id)`;
- читает набор attachments по ids и user;
- добавляет attachments пачкой;
- помечает attachments consumed;
- находит expired unconsumed attachments;
- удаляет attachments пачкой;
- выбирает существующие `blob_id` для orphan cleanup.

### Settings repository

`SettingsRepository`:

- читает AI settings по `user_id`;
- upsert-ит settings через existence check по `user_id`.

## Action/Rollback persistence gap

В `ShuKnow.Domain.Entities` уже есть domain models для action history:

- `UserAction`
- `ActionItem`
- `ActionItemFileCreated`
- `ActionItemFileMoved`
- `ActionItemFolderCreated`

Но текущий `AppDbContext` не содержит `DbSet` для этих сущностей, EF configurations для них отсутствуют, а миграции не создают action tables. `ActionRepository`, `IActionTrackingService`, `IActionQueryService` и `IRollbackService` остаются placeholders. Поэтому текущие AI/file/folder операции не пишут rollback history в БД.

## Operational notes

- Применение миграций запускается из Host; в migration-only mode используется `SHUKNOW_APPLY_MIGRATIONS_ONLY`.
- `PostgresUnitOfWork.SaveChangesAsync` является границей commit для repository changes.
- Blob lifecycle разделён между БД и storage: `files.blob_id` и `chat_attachments.blob_id` указывают на blob objects, а `BlobDeletionQueue`/`BlobOrphanCleanupService` чистят storage.
- Most reads use `AsNoTracking`; update сценарии явно используют tracked entity или `Update/UpdateRange`.
