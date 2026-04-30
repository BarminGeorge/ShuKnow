# ShuKnow MVP — Service Architecture

## Scope

This document reflects the current backend service graph in `backend/ShuKnow.sln`.

Layers:

- `ShuKnow.Host`: composition root, `.env` loading, migrations through `SHUKNOW_APPLY_MIGRATIONS_ONLY`, runtime startup.
- `ShuKnow.WebAPI`: controllers, DTO/mappers, validators, SignalR hub, auth/cookies/Swagger/AsyncAPI/health/metrics endpoints.
- `ShuKnow.Application`: use-case services and application ports.
- `ShuKnow.Domain`: entities, enums, repository interfaces, domain helpers.
- `ShuKnow.Infrastructure`: EF Core repositories, PostgreSQL unit of work, JWT/identity/encryption, blob storage, Tornado AI integration, hosted cleanup services.
- `ShuKnow.Metrics`: Redis-backed metric attribution and OpenTelemetry/Prometheus counters.

## Application Services

| Service/interface | Current status | Runtime role |
|---|---|---|
| `IIdentityService` | Implemented in Infrastructure | Registration/login and JWT issuance. |
| `ICurrentUserService` | Implemented in WebAPI | Reads current authenticated user from HTTP/SignalR context. |
| `ICurrentConnectionService` | Implemented in WebAPI | Tracks current SignalR connection for targeted hub notifications. |
| `IFolderService` | Implemented | Folder tree/list/create/get/update/delete subtree/move/reorder plus path lookup and path creation for AI tools. |
| `IFileService` | Implemented | File metadata/content operations, folder listing, path lookup, move/reorder, blob delete queue integration. |
| `IWorkspacePathService` | Implemented | Resolves user-facing folder/file paths to IDs and creation targets. |
| `IAttachmentService` | Implemented | Uploads staged chat attachments, reads metadata, marks attachments consumed. |
| `IAttachmentFileService` | Implemented | Saves a staged attachment as a persistent file. |
| `IChatService` | Implemented | Chat session lifecycle, cursor-paginated messages, full history load, message persistence, expired session deletion. |
| `ISettingsService` | Implemented | Per-user AI settings CRUD and connection tests. |
| `IAiToolsService` | Implemented in Application | Executes model tool calls using folder/file/attachment services and emits hub notifications. |
| `IAiService` | Implemented in Infrastructure | Tornado-based message processing and connection test workflow. |
| `IProcessingOperationService` | Implemented in Infrastructure | Tracks cancellable SignalR operations per connection. |
| `IChatNotificationService` | Implemented in WebAPI | Sends hub events to the current connection and records AI/file metrics where applicable. |
| `IActionQueryService` | Not implemented | Registered but methods throw `NotImplementedException`. |
| `IActionTrackingService` | Not implemented | Registered but methods throw `NotImplementedException`. |
| `IRollbackService` | Not implemented | Registered but methods throw `NotImplementedException`. |

## Current AI Service Flow

`ChatHub.SendMessage` is the runtime entry point for AI processing.

1. `IProcessingOperationService.BeginOperation(connectionId)` creates an operation ID and cancellation token.
2. `IChatNotificationService.SendProcessingStartedAsync()` emits `OnProcessingStarted`.
3. `ISettingsService.GetOrCreateAsync()` loads user AI settings.
4. `IAiService.ProcessMessageAsync(sessionId, content, attachmentIds, settings, operationId, ct)` runs the workflow.
5. `TornadoAiService` loads the chat session and previous messages.
6. `TornadoPromptBuilder` builds system instructions and user message parts, including staged attachments.
7. `TornadoConversationFactory` builds the provider conversation using encrypted user settings.
8. `TornadoAiService` streams LLM chunks through `IChatNotificationService`.
9. `TornadoToolsService` dispatches tool calls to `IAiToolsService`.
10. `AiToolsService` performs folder/file/attachment mutations and emits specific hub events.
11. `TornadoAiService` persists the user message and resulting AI messages.
12. `ChatHub` emits `OnProcessingCompleted` or `OnProcessingFailed`.

## AI Tool Operations

| Tool operation | Backing services | Notification |
|---|---|---|
| `CreateFolderAsync(folderPath, description, emoji)` | `IFolderService.CreateByPathAsync` | `OnFolderCreated` |
| `CreateTextFileAsync(filePath, content)` | `IWorkspacePathService`, `IFileService.UploadAsync` | `OnFileCreated` |
| `SaveAttachment(attachmentId, filePath)` | `IAttachmentService`, `IAttachmentFileService` | `OnAttachmentSaved` |
| `AppendTextAsync(filePath, text)` | `IFileService.GetByPathAsync`, `IFileService.UpdateTextContentAsync` | `OnTextAppended` |
| `PrependTextAsync(filePath, text)` | `IFileService.GetByPathAsync`, `IFileService.UpdateTextContentAsync` | `OnTextPrepended` |
| `MoveFileAsync(sourcePath, destinationPath)` | `IFileService.GetByPathAsync`, `IWorkspacePathService`, `IFileService.MoveAsync` | `OnFileMoved` |

Tool operations are user-scoped through `ICurrentUserService` and repository filters. File create/move notifications also record AI item metrics.

## Infrastructure Services

| Component | Role |
|---|---|
| `AppDbContext` | EF Core 8/Npgsql persistence with snake_case naming. |
| `PostgresUnitOfWork` | Commits repository changes through `SaveChangesAsync`. |
| `BlobStorageService` | Stable app-facing blob storage API. |
| `FileSystemBlobStorageProvider` | Local file-system blob backend. |
| `S3BlobStorageProvider` | S3-compatible backend, used with RustFS in compose files. |
| `BlobDeletionQueue` | Hosted queue for asynchronous blob deletions after DB commits. |
| `BlobOrphanCleanupService` | Hosted cleanup for unreferenced blob objects. |
| `ChatSessionCleanupService` | Hosted cleanup for sessions older than configured max age. |
| `S3BucketInitializationService` | Ensures configured S3 bucket exists when S3 storage is active. |
| `TornadoAiService` | Main AI workflow service. |
| `TornadoPromptBuilder` | Builds system instructions, prior chat history, and multimodal message parts. |
| `TornadoToolsService` | Registers and dispatches LLM tool calls. |
| `TornadoConversationFactory` | Creates provider conversations and decrypts API keys. |

## Persistence Status

Implemented repositories:

- `UserRepository`
- `IdentityUserRepository`
- `FolderRepository`
- `FileRepository`
- `ChatSessionRepository`
- `ChatMessageRepository`
- `AttachmentRepository`
- `SettingsRepository`

Not implemented:

- `ActionRepository`

## Metrics Services

`ShuKnow.Metrics` registers:

- `IMetricsRepository` backed by Redis.
- `IMetricsService` for product event recording.
- `MetricsInstruments` for Prometheus/OpenTelemetry counters.

Runtime metric calls currently happen on:

- Chat attachment upload: content saved.
- File upload, content replacement, text update: content saved.
- File content download: content opened.
- Manual file move: manual move.
- AI-created or AI-moved files: AI item processed.

## Known Gaps

- Actions/Rollback services and repository are placeholders.
- Current AI tool execution does not create action records, so rollback cannot undo AI operations yet.
- `IChatNotificationService` depends on the current SignalR connection; AI processing should remain initiated from hub context unless this dependency is redesigned.
- `TornadoPromptBuilder` is the place to evolve prompt/context injection for folder and file summaries.
