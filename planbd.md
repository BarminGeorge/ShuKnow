# План БД (PostgreSQL) для ShuKnow

## 1) Что проанализировано

### Кодовая база (`backend`)
- Текущая фактическая схема в EF Core: только `users` и `identity_users`.
- Доменные сущности уже есть: `User`, `Folder`, `File`, `ChatSession`, `ChatMessage`, `FileContent`.
- Реализованный REST-контроллер в коде: только `AuthController`.
- Текущие миграции: `Initial`, `AddAuth`, `MakeLoginUnique`.

Ключевые файлы:
- `backend/ShuKnow.Infrastructure/Persistent/AppDbContext.cs`
- `backend/ShuKnow.Infrastructure/Migrations/AppDbContextModelSnapshot.cs`
- `backend/ShuKnow.Domain/Entities/*.cs`
- `backend/ShuKnow.WebAPI/Controllers/AuthController.cs`

### API-описание (ваш документ)
Покрывает полный целевой scope:
- Auth, Folders, Files, Chat (session/messages/attachments), Settings(AI), Actions/Rollback.
- SignalR `ChatHub` со стримингом, отменой и событиями прогресса.

Вывод: текущая кодовая БД покрывает только auth, а для целевого API нужна расширенная схема.

---

## 2) Целевая модель данных

### Основные агрегаты
- `users` + `identity_users`: аутентификация (оставляем совместимо с текущим кодом).
- `folders` (иерархия) + `files` + `file_contents`: виртуальная ФС пользователя.
- `chat_sessions` + `chat_messages`: сессии и история чата.
- `chat_attachments` + `chat_message_attachments`: staging вложений и связь с сообщениями.
- `user_ai_settings`: настройки LLM на пользователя.
- `actions` + `action_items`: журнал мутаций ИИ и источник отката.

### Важные правила
- Мультиарендность: все пользовательские сущности привязаны к `user_id`.
- Одна активная chat-сессия на пользователя.
- Уникальность имени папки в пределах одного `parent_folder_id` (включая корень).
- Уникальность имени файла внутри папки.
- Inbox-папка одна на пользователя (`is_inbox=true`).
- `action_items` хранит снимок данных (имена/ID/направления), чтобы rollback был детерминированным, даже если объект потом удален.

---

## 3) DBML (для импорта)

```dbml
Project ShuKnow {
  database_type: 'PostgreSQL'
  Note: 'Целевая схема под API Auth/Folders/Files/Chat/Settings/Actions+Rollback'
}

Enum chat_message_role {
  User
  Ai
  System
}

Enum chat_session_status {
  Active
  Closed
}

Enum storage_kind {
  Inline
  External
}

Enum action_item_type {
  FileCreated
  FileMoved
  FolderCreated
}

Table users {
  id uuid [pk, not null, default: `gen_random_uuid()`]
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
}

Table identity_users {
  id uuid [pk, not null]
  login varchar(100) [not null, unique, note: 'Рекомендуется CITEXT для case-insensitive логина']
  password_hash text [not null]
  created_at timestamptz [not null, default: `now()`]
}

Table folders {
  id uuid [pk, not null, default: `gen_random_uuid()`]
  user_id uuid [not null]
  parent_folder_id uuid
  name varchar(255) [not null]
  description text [not null, default: `''`]
  sort_order int [not null, default: 0]
  is_inbox boolean [not null, default: false]
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    (user_id, parent_folder_id, sort_order, id) [name: 'ix_folders_tree_lookup']
    (user_id, parent_folder_id, name) [name: 'ux_folders_parent_name', unique, note: 'Для корня нужен partial unique index, см. раздел 4']
  }
}

Table files {
  id uuid [pk, not null, default: `gen_random_uuid()`]
  folder_id uuid [not null]
  name varchar(255) [not null]
  description text [not null, default: `''`]
  content_type varchar(255) [not null]
  size_bytes bigint [not null]
  version int [not null, default: 1, note: 'Инкремент при изменении содержимого/метаданных']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    (folder_id, name) [name: 'ux_files_folder_name', unique]
    (folder_id, updated_at, id) [name: 'ix_files_folder_paging']
  }
}

Table file_contents {
  file_id uuid [pk, not null]
  storage_kind storage_kind [not null, default: 'Inline']
  data bytea
  storage_reference text
  checksum_sha256 bytea
  updated_at timestamptz [not null, default: `now()`]

  indexes {
    (storage_reference) [name: 'ix_file_contents_storage_ref']
  }
}

Table chat_sessions {
  id uuid [pk, not null, default: `gen_random_uuid()`]
  user_id uuid [not null]
  status chat_session_status [not null, default: 'Active']
  created_at timestamptz [not null, default: `now()`]
  closed_at timestamptz
  last_message_at timestamptz

  indexes {
    (user_id, status, created_at) [name: 'ix_chat_sessions_user_status']
  }
}

Table chat_messages {
  id uuid [pk, not null, default: `gen_random_uuid()`]
  session_id uuid [not null]
  role chat_message_role [not null]
  content text [not null]
  created_at timestamptz [not null, default: `now()`]

  indexes {
    (session_id, created_at, id) [name: 'ix_chat_messages_cursor']
  }
}

Table chat_attachments {
  id uuid [pk, not null, default: `gen_random_uuid()`]
  user_id uuid [not null]
  file_name varchar(255) [not null]
  content_type varchar(255) [not null]
  size_bytes bigint [not null]
  storage_kind storage_kind [not null, default: 'Inline']
  data bytea
  storage_reference text
  uploaded_at timestamptz [not null, default: `now()`]
  expires_at timestamptz [not null]
  consumed_at timestamptz
  deleted_at timestamptz

  indexes {
    (user_id, expires_at) [name: 'ix_chat_attachments_expiration']
    (user_id, uploaded_at) [name: 'ix_chat_attachments_user_uploaded']
  }
}

Table chat_message_attachments {
  message_id uuid [pk, not null]
  attachment_id uuid [pk, not null, unique, note: 'Один staging attachment используется одним сообщением']
  sort_order int [not null, default: 0]
  attached_at timestamptz [not null, default: `now()`]
}

Table user_ai_settings {
  user_id uuid [pk, not null]
  base_url text [not null]
  api_key_encrypted text [not null]
  last_tested_at timestamptz
  last_test_success boolean
  last_test_latency_ms int
  last_test_error text
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
}

Table actions {
  id uuid [pk, not null, default: `gen_random_uuid()`]
  user_id uuid [not null]
  operation_id uuid [not null, unique, note: 'SignalR OperationId -> ActionId']
  chat_session_id uuid
  trigger_message_id uuid
  summary text [not null]
  item_count int [not null, default: 0]
  is_rolled_back boolean [not null, default: false]
  created_at timestamptz [not null, default: `now()`]
  rolled_back_at timestamptz
  rollback_error text

  indexes {
    (user_id, created_at, id) [name: 'ix_actions_user_recent']
    (is_rolled_back, created_at) [name: 'ix_actions_rollback_state']
  }
}

Table action_items {
  id uuid [pk, not null, default: `gen_random_uuid()`]
  action_id uuid [not null]
  sequence_no int [not null, note: 'Порядок выполнения; rollback идет в обратном порядке']
  item_type action_item_type [not null]

  file_id uuid
  folder_id uuid
  from_folder_id uuid
  to_folder_id uuid

  file_name varchar(255)
  folder_name varchar(255)
  target_folder_name varchar(255)

  file_version_before int
  file_version_after int

  details jsonb [note: 'Доп. полезная нагрузка классификации/исполнения']
  created_at timestamptz [not null, default: `now()`]
  rolled_back boolean [not null, default: false]
  rollback_note text

  indexes {
    (action_id, sequence_no) [name: 'ux_action_items_sequence', unique]
    (file_id) [name: 'ix_action_items_file']
    (folder_id) [name: 'ix_action_items_folder']
  }
}

Ref: identity_users.id > users.id [delete: cascade]

Ref: folders.user_id > users.id [delete: cascade]
Ref: folders.parent_folder_id > folders.id [delete: restrict]

Ref: files.folder_id > folders.id [delete: restrict]
Ref: file_contents.file_id > files.id [delete: cascade]

Ref: chat_sessions.user_id > users.id [delete: cascade]
Ref: chat_messages.session_id > chat_sessions.id [delete: cascade]

Ref: chat_attachments.user_id > users.id [delete: cascade]
Ref: chat_message_attachments.message_id > chat_messages.id [delete: cascade]
Ref: chat_message_attachments.attachment_id > chat_attachments.id [delete: restrict]

Ref: user_ai_settings.user_id > users.id [delete: cascade]

Ref: actions.user_id > users.id [delete: cascade]
Ref: actions.chat_session_id > chat_sessions.id [delete: set null]
Ref: actions.trigger_message_id > chat_messages.id [delete: set null]
Ref: action_items.action_id > actions.id [delete: cascade]
```

---

## 4) SQL-ограничения, которые лучше добавить после импорта DBML

DBML не всегда удобно выражает partial indexes и сложные CHECK. Для PostgreSQL рекомендуется добавить:

```sql
-- 1) Уникальность имен папок в корне (parent_folder_id IS NULL)
CREATE UNIQUE INDEX ux_folders_root_name
ON folders (user_id, name)
WHERE parent_folder_id IS NULL;

-- 2) Уникальность имен в дочерних папках
CREATE UNIQUE INDEX ux_folders_child_name
ON folders (user_id, parent_folder_id, name)
WHERE parent_folder_id IS NOT NULL;

-- 3) Ровно одна Inbox-папка на пользователя
CREATE UNIQUE INDEX ux_folders_inbox_once
ON folders (user_id)
WHERE is_inbox = true;

-- 4) Только одна активная chat-сессия на пользователя
CREATE UNIQUE INDEX ux_chat_sessions_one_active
ON chat_sessions (user_id)
WHERE status = 'Active';

-- 5) Гарантия консистентности хранения content (inline/external)
ALTER TABLE file_contents
ADD CONSTRAINT ck_file_contents_payload
CHECK (
  (storage_kind = 'Inline'  AND data IS NOT NULL AND storage_reference IS NULL) OR
  (storage_kind = 'External' AND data IS NULL AND storage_reference IS NOT NULL)
);

-- 6) Такая же гарантия для chat_attachments
ALTER TABLE chat_attachments
ADD CONSTRAINT ck_chat_attachments_payload
CHECK (
  (storage_kind = 'Inline'  AND data IS NOT NULL AND storage_reference IS NULL) OR
  (storage_kind = 'External' AND data IS NULL AND storage_reference IS NOT NULL)
);

-- 7) При is_rolled_back=true должна быть дата отката
ALTER TABLE actions
ADD CONSTRAINT ck_actions_rollback_timestamp
CHECK (
  (is_rolled_back = false AND rolled_back_at IS NULL) OR
  (is_rolled_back = true  AND rolled_back_at IS NOT NULL)
);
```

---

## 5) Краткая карта соответствия API -> таблицы

- `AuthController`: `users`, `identity_users`
- `FoldersController`: `folders`
- `FilesController`: `files`, `file_contents`
- `ChatController`: `chat_sessions`, `chat_messages`, `chat_attachments`, `chat_message_attachments`
- `SettingsController`: `user_ai_settings`
- `ActionsController`: `actions`, `action_items`
- `ChatHub` (SignalR): в основном `chat_sessions`, `chat_messages`, `chat_attachments`, `actions`, `action_items`, `folders`, `files`

---

## 6) Переход от текущего состояния

Текущее состояние в репозитории уже содержит:
- `users`
- `identity_users`

Новые таблицы добавляются миграцией без ломающих изменений auth-части.  
Важно сохранить 1:1 связь `identity_users.id -> users.id`, так как она уже используется сервисом регистрации/логина.
