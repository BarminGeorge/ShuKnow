# ShuKnow MVP — Архитектура сервисов

## Область действия

Документ отражает текущий граф сервисов backend-решения `backend/ShuKnow.sln`.

Слои:

- `ShuKnow.Host`: корень композиции, загрузка `.env`, миграции по `SHUKNOW_APPLY_MIGRATIONS_ONLY`, запуск приложения.
- `ShuKnow.WebAPI`: контроллеры, DTO/mappers, validators, SignalR hub, auth/cookies, Swagger, AsyncAPI, health и metrics endpoints.
- `ShuKnow.Application`: сервисы сценариев использования и application ports.
- `ShuKnow.Domain`: сущности, enum-ы, интерфейсы репозиториев и domain helpers.
- `ShuKnow.Infrastructure`: EF Core repositories, PostgreSQL unit of work, JWT/identity/encryption, blob storage, интеграция с Tornado AI и фоновые cleanup services.
- `ShuKnow.Metrics`: Redis-backed metric attribution и OpenTelemetry/Prometheus counters.

## Сервисы Application

| Сервис/interface | Текущий статус | Runtime-роль |
|---|---|---|
| `IIdentityService` | Реализован в Infrastructure | Регистрация, вход и выдача JWT. |
| `ICurrentUserService` | Реализован в WebAPI | Читает текущего authenticated user из HTTP/SignalR context. |
| `ICurrentConnectionService` | Реализован в WebAPI | Отслеживает текущее SignalR-соединение для адресных hub notifications. |
| `IFolderService` | Реализован | Дерево папок, список, создание, чтение, обновление, удаление subtree, move/reorder, path lookup и path creation для AI tools. |
| `IFileService` | Реализован | Операции с метаданными и контентом файлов, список файлов в папке, path lookup, move/reorder и интеграция с blob delete queue. |
| `IWorkspacePathService` | Реализован | Разрешает пользовательские folder/file paths в IDs и targets для создания. |
| `IAttachmentService` | Реализован | Загружает staged chat attachments, читает metadata, помечает attachments consumed. |
| `IAttachmentFileService` | Реализован | Сохраняет staged attachment как persistent file. |
| `IChatService` | Реализован | Жизненный цикл chat session, cursor-пагинация сообщений, загрузка полной истории, сохранение сообщений и удаление expired sessions. |
| `ISettingsService` | Реализован | CRUD per-user AI settings и connection tests. |
| `IAiToolsService` | Реализован в Application | Выполняет model tool calls через folder/file/attachment services и отправляет hub notifications. |
| `IAiService` | Реализован в Infrastructure | Tornado-based обработка сообщений и workflow проверки соединения. |
| `IProcessingOperationService` | Реализован в Infrastructure | Отслеживает cancellable SignalR operations по connection. |
| `IChatNotificationService` | Реализован в WebAPI | Отправляет hub events в текущее connection и записывает AI/file metrics, где это применимо. |
| `IActionQueryService` | Не реализован | Зарегистрирован, но методы бросают `NotImplementedException`. |
| `IActionTrackingService` | Не реализован | Зарегистрирован, но методы бросают `NotImplementedException`. |
| `IRollbackService` | Не реализован | Зарегистрирован, но методы бросают `NotImplementedException`. |

## Текущий поток AI-сервиса

`ChatHub.SendMessage` является runtime entry point для AI processing.

1. `IProcessingOperationService.BeginOperation(connectionId)` создаёт operation ID и cancellation token.
2. `IChatNotificationService.SendProcessingStartedAsync()` отправляет `OnProcessingStarted`.
3. `ISettingsService.GetOrCreateAsync()` загружает AI-настройки пользователя.
4. `IAiService.ProcessMessageAsync(sessionId, content, attachmentIds, settings, operationId, ct)` запускает workflow.
5. `TornadoAiService` загружает chat session и предыдущие messages.
6. `TornadoPromptBuilder` собирает системные инструкции и user message parts, включая staged attachments.
7. `TornadoConversationFactory` создаёт provider conversation с encrypted user settings.
8. `TornadoAiService` передаёт LLM chunks через `IChatNotificationService`.
9. `TornadoToolsService` dispatch-ит tool calls в `IAiToolsService`.
10. `AiToolsService` выполняет folder/file/attachment mutations и отправляет specific hub events.
11. `TornadoAiService` сохраняет user message и resulting AI messages.
12. `ChatHub` отправляет `OnProcessingCompleted` или `OnProcessingFailed`.

## Операции AI tools

`IAiToolsService` сейчас поддерживает:

| Операция tool | Используемые сервисы | Notification |
|---|---|---|
| `CreateFolderAsync(folderPath, description, emoji)` | `IFolderService.CreateByPathAsync` | `OnFolderCreated` |
| `CreateTextFileAsync(filePath, content)` | `IWorkspacePathService`, `IFileService.UploadAsync` | `OnFileCreated` |
| `SaveAttachment(attachmentId, filePath)` | `IAttachmentService`, `IAttachmentFileService` | `OnAttachmentSaved` |
| `AppendTextAsync(filePath, text)` | `IFileService.GetByPathAsync`, `IFileService.UpdateTextContentAsync` | `OnTextAppended` |
| `PrependTextAsync(filePath, text)` | `IFileService.GetByPathAsync`, `IFileService.UpdateTextContentAsync` | `OnTextPrepended` |
| `MoveFileAsync(sourcePath, destinationPath)` | `IFileService.GetByPathAsync`, `IWorkspacePathService`, `IFileService.MoveAsync` | `OnFileMoved` |

Tool operations scoped по пользователю через `ICurrentUserService` и repository filters. Notifications для file create/move также записывают AI item metrics.

## Сервисы Infrastructure

| Компонент | Роль |
|---|---|
| `AppDbContext` | EF Core 8/Npgsql persistence со snake_case naming. |
| `PostgresUnitOfWork` | Коммитит repository changes через `SaveChangesAsync`. |
| `BlobStorageService` | Стабильный app-facing blob storage API. |
| `FileSystemBlobStorageProvider` | Локальный file-system blob backend. |
| `S3BlobStorageProvider` | S3-compatible backend, используется с RustFS в compose files. |
| `BlobDeletionQueue` | Фоновая queue для asynchronous blob deletions после DB commits. |
| `BlobOrphanCleanupService` | Фоновая cleanup service для unreferenced blob objects. |
| `ChatSessionCleanupService` | Фоновая cleanup service для sessions старше configured max age. |
| `S3BucketInitializationService` | Гарантирует наличие configured S3 bucket при активном S3 storage. |
| `TornadoAiService` | Основной AI workflow service. |
| `TornadoPromptBuilder` | Собирает системные инструкции, prior chat history и multimodal message parts. |
| `TornadoToolsService` | Регистрирует и dispatch-ит LLM tool calls. |
| `TornadoConversationFactory` | Создаёт provider conversations и расшифровывает API keys. |

## Статус persistence

Реализованные repositories:

- `UserRepository`
- `IdentityUserRepository`
- `FolderRepository`
- `FileRepository`
- `ChatSessionRepository`
- `ChatMessageRepository`
- `AttachmentRepository`
- `SettingsRepository`

Не реализовано:

- `ActionRepository`

## Сервисы метрик

`ShuKnow.Metrics` регистрирует:

- `IMetricsRepository` на Redis.
- `IMetricsService` для записи product events.
- `MetricsInstruments` для Prometheus/OpenTelemetry counters.

Текущие runtime metric calls:

- Chat attachment upload: content saved.
- File upload, content replacement, text update: content saved.
- File content download: content opened.
- Manual file move: manual move.
- AI-created или AI-moved files: AI item processed.

## Известные gaps

- Actions/Rollback services и repository остаются placeholders.
- Текущее AI tool execution не создаёт action records, поэтому rollback не может откатить AI operations.
- `IChatNotificationService` зависит от текущего SignalR connection; AI processing должен оставаться инициированным из hub context, пока эта зависимость не будет переработана.
- `TornadoPromptBuilder` является местом для развития prompt/context injection для folder и file summaries.
