# ShuKnow MVP — Database Architecture

## Scope

This document reflects the current persistence model in `backend/ShuKnow.sln`.

Source of truth:

- `backend/ShuKnow.Infrastructure/Persistent/AppDbContext.cs`
- `backend/ShuKnow.Infrastructure/Persistent/DbConfiguration/*.cs`
- `backend/ShuKnow.Infrastructure/Persistent/Repositories/*.cs`
- `backend/ShuKnow.Domain/Entities/*.cs`
- `backend/ShuKnow.Domain/Repositories/*.cs`

Persistence stack: EF Core 8, Npgsql/PostgreSQL, migrations in `ShuKnow.Infrastructure/Migrations`, and application-level commits through `PostgresUnitOfWork`.

## DbContext

`AppDbContext` registers these `DbSet`s:

| DbSet | Table | Entity |
|---|---|---|
| `Users` | `users` | `User` |
| `IdentityUsers` | `identity_users` | `ShuKnow.Infrastructure.Misc.IdentityUser` |
| `Folders` | `folders` | `Folder` |
| `Files` | `files` | `File` |
| `ChatSessions` | `chat_sessions` | `ChatSession` |
| `ChatMessages` | `chat_messages` | `ChatMessage` |
| `ChatAttachments` | `chat_attachments` | `ChatAttachment` |
| `UserAiSettings` | `user_ai_settings` | `UserAiSettings` |

`OnModelCreating` applies every `IEntityTypeConfiguration` from the Infrastructure assembly.

## Tables

### `users`

Base application user record.

| Column | Type | Purpose |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `login` | `text` | User login. |

Relationships:

- Principal for `identity_users`, `folders`, `chat_sessions`, `chat_attachments`, and `user_ai_settings`.

### `identity_users`

Auth credentials for login/password flow.

| Column | Type | Purpose |
|---|---|---|
| `id` | `uuid` | Primary key and FK to `users.id`. |
| `login` | `text` | Unique login. |
| `password_hash` | `text` | Password hash. |

Constraints and indexes:

- Unique index on `login`.
- One-to-one relationship with `users`, cascade delete.

### `folders`

Per-user folder hierarchy.

| Column | Type | Purpose |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | Folder owner. |
| `parent_folder_id` | `uuid?` | Parent folder; `null` means root. |
| `name` | `varchar(256)` | Folder name. |
| `description` | `text` | Description. |
| `sort_order` | `integer` | User-defined order inside parent. |
| `emoji` | `text?` | Optional visual marker. |

Constraints and indexes:

- FK `user_id -> users.id`, cascade delete.
- Self-FK `parent_folder_id -> folders.id`, cascade delete.
- Index on `(user_id, parent_folder_id, sort_order)`.
- Index on `(user_id, parent_folder_id, name)`.

### `files`

Persistent file metadata. File content lives in external blob storage; the database stores `blob_id`.

| Column | Type | Purpose |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | File owner. |
| `blob_id` | `uuid` | Blob object ID. |
| `folder_id` | `uuid?` | Folder; `null` means root. |
| `name` | `text` | File name. |
| `description` | `text` | Description. |
| `content_type` | `text` | MIME type. |
| `size_bytes` | `bigint` | Content size. |
| `version` | `integer` | Metadata/content version. |
| `checksum_sha256` | `text?` | Optional SHA-256 checksum. |
| `sort_order` | `integer` | User-defined order inside folder. |
| `created_at` | `timestamp with time zone` | Created timestamp. |

Constraints and indexes:

- FK `folder_id -> folders.id`.
- Index on `folder_id`.
- User ownership is enforced by repository query filters using `user_id`.

### `chat_sessions`

User chat session.

| Column | Type | Purpose |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | Session owner. |
| `status` | `integer` | `ChatSessionStatus` stored as int. |
| `created_at` | `timestamp with time zone` | Default `CURRENT_TIMESTAMP`. |
| `last_activity_at` | `timestamp with time zone` | Default `CURRENT_TIMESTAMP`; used by cleanup service. |

Constraints and indexes:

- FK `user_id -> users.id`, cascade delete.
- Non-unique index on `user_id`.
- Index on `last_activity_at`.

### `chat_messages`

Messages inside a chat session.

| Column | Type | Purpose |
|---|---|---|
| `id` | `uuid` | Primary key. |
| `session_id` | `uuid` | Chat session. |
| `role` | `integer` | `ChatMessageRole` stored as int. |
| `content` | `text` | Message text. |
| `created_at` | `timestamp with time zone` | Default `CURRENT_TIMESTAMP`. |

Constraints and indexes:

- FK `session_id -> chat_sessions.id`, cascade delete.
- Index on `(session_id, created_at, id)` for stable cursor pagination.

### `chat_attachments`

Staged attachments for the chat workflow before saving as persistent files.

| Column | Type | Purpose |
|---|---|---|
| `id` | `uuid` | Primary key, default `gen_random_uuid()`. |
| `blob_id` | `uuid` | Blob object ID. |
| `user_id` | `uuid` | Attachment owner. |
| `file_name` | `varchar(255)` | Original filename. |
| `content_type` | `varchar(100)` | MIME type. |
| `size_bytes` | `bigint` | Blob size. |
| `created_at` | `timestamp with time zone` | Default `CURRENT_TIMESTAMP`. |
| `is_consumed` | `boolean` | Attachment has already been saved/used. |

Constraints and indexes:

- FK `user_id -> users.id`, cascade delete.
- Index on `user_id`.
- Index on `blob_id`.
- Index on `(created_at, is_consumed)` for expired unconsumed attachment cleanup.

### `user_ai_settings`

Per-user AI provider settings.

| Column | Type | Purpose |
|---|---|---|
| `user_id` | `uuid` | Primary key and FK to `users.id`. |
| `base_url` | `text` | Provider base URL. |
| `api_key_encrypted` | `text` | Encrypted API key. |
| `provider` | `integer` | `AiProvider` stored as int. |
| `model_id` | `text` | Model identifier. |
| `last_test_success` | `boolean?` | Last connection test result. |
| `last_test_latency_ms` | `integer?` | Last test latency. |
| `last_test_error` | `text?` | Last test error. |

Constraints and indexes:

- One-to-one relationship with `users`, cascade delete.

## Repositories

All repository interfaces return `Ardalis.Result` and do not call `SaveChangesAsync` directly. The calling application service commits through `IUnitOfWork`/`PostgresUnitOfWork` when the use case requires persistence.

| Interface | Implementation | Main table | Status |
|---|---|---|---|
| `IUserRepository` | `UserRepository` | `users` | Implemented. |
| `IIdentityUserRepository` | `IdentityUserRepository` | `identity_users` | Implemented in Infrastructure. |
| `IFolderRepository` | `FolderRepository` | `folders` | Implemented. |
| `IFileRepository` | `FileRepository` | `files` | Implemented. |
| `IChatSessionRepository` | `ChatSessionRepository` | `chat_sessions` | Implemented. |
| `IChatMessageRepository` | `ChatMessageRepository` | `chat_messages` | Implemented. |
| `IAttachmentRepository` | `AttachmentRepository` | `chat_attachments` | Implemented. |
| `ISettingsRepository` | `SettingsRepository` | `user_ai_settings` | Implemented. |
| `IActionRepository` | `ActionRepository` | Not wired into `AppDbContext` | Placeholder; methods throw `NotImplementedException`. |

### User/auth repositories

- `UserRepository.GetByIdAsync` reads `users` with `AsNoTracking`.
- `UserRepository.AddAsync` adds a user to the change tracker.
- `IdentityUserRepository.GetByLoginAsync` looks up credentials by login and returns `Unauthorized` when no record exists.
- `IdentityUserRepository.ContainsLoginAsync` checks login uniqueness.
- `IdentityUserRepository.AddAsync` adds a credentials record.

### Folder repository

`FolderRepository` scopes read/write operations by `user_id`.

Main operations:

- read folder by `(id, user_id)`;
- check folder existence;
- load tree/list/root/children ordered by `sort_order`, then `name`;
- resolve ancestors with cycle detection;
- check name conflicts inside a parent;
- add/update/update range;
- delete/delete subtree by deleting the root folder and relying on cascade delete.

### File repository

`FileRepository` stores only metadata and `blob_id`; blob content is handled by blob storage services.

Main operations:

- read file by `(id, user_id)` with `Folder` included;
- tracked read for update scenarios;
- paged list by folder;
- check name conflicts inside a folder;
- add/update/update range;
- delete a file or files by folder;
- user-wide and folder-specific lists;
- lookup by `(folder_id, user_id, file_name)`;
- select existing `blob_id`s for orphan cleanup.

### Chat repositories

`ChatSessionRepository`:

- reads a session by `(id, user_id)`;
- adds a session;
- deletes a session by id;
- bulk-deletes sessions older than a cutoff by `last_activity_at`.

`ChatMessageRepository`:

- adds one or many messages;
- reads session history ordered by `created_at`, then `id`;
- returns cursor-paged messages using a base64 cursor shaped as `sessionId|createdAt|messageId`;
- counts messages in a session;
- deletes all messages for a session.

### Attachment repository

`AttachmentRepository`:

- reads a staged attachment by `(id, user_id)`;
- reads a set of attachments by ids and user;
- adds attachments in a batch;
- marks attachments consumed;
- finds expired unconsumed attachments;
- deletes attachments in a batch;
- selects existing `blob_id`s for orphan cleanup.

### Settings repository

`SettingsRepository`:

- reads AI settings by `user_id`;
- upserts settings through an existence check by `user_id`.

## Action/Rollback Persistence Gap

`ShuKnow.Domain.Entities` already contains action history domain models:

- `UserAction`
- `ActionItem`
- `ActionItemFileCreated`
- `ActionItemFileMoved`
- `ActionItemFolderCreated`

However, the current `AppDbContext` has no `DbSet`s for these entities, EF configurations for them do not exist, and migrations do not create action tables. `ActionRepository`, `IActionTrackingService`, `IActionQueryService`, and `IRollbackService` are still placeholders. Current AI/file/folder operations therefore do not write rollback history to the database.

## Operational Notes

- Migrations are applied from Host; migration-only mode uses `SHUKNOW_APPLY_MIGRATIONS_ONLY`.
- `PostgresUnitOfWork.SaveChangesAsync` is the commit boundary for repository changes.
- Blob lifecycle is split between database and storage: `files.blob_id` and `chat_attachments.blob_id` point at blob objects, while `BlobDeletionQueue`/`BlobOrphanCleanupService` clean storage.
- Most reads use `AsNoTracking`; update scenarios explicitly use tracked entities or `Update/UpdateRange`.
