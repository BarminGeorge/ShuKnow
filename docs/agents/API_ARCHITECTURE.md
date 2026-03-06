# API Architecture Overview

## Purpose

This document explains how the API is structured and why it is designed this way.

- [docs/openapi.yaml](../openapi.yaml) is the source of truth for REST contracts.
- [docs/asyncapi.yaml](../asyncapi.yaml) is the source of truth for SignalR events and message payloads.
- This document focuses on runtime behavior, component boundaries, and architectural decisions.

## System Overview

ShuKnow exposes two communication styles:

- REST for request-response operations such as authentication, folder and file CRUD, chat session reads, attachment upload, settings management, and rollback endpoints.
- SignalR for long-running AI workflows such as message submission, token streaming, progress notifications, and cancellation.

Authentication is shared across both transports:

- HTTP endpoints accept JWT from either the `Authorization: Bearer` header or an HTTP-only cookie.
- SignalR connections use the `access_token` query parameter and pass through the same JWT validation pipeline.

The system is layered:

- `ShuKnow.WebAPI` exposes controllers and the chat hub.
- `ShuKnow.Application` coordinates use cases and orchestration.
- `ShuKnow.Domain` contains core entities and business rules.
- `ShuKnow.Infrastructure` persists data and integrates with the LLM provider.

## Runtime Flows

### AI Classification Flow

This is the main end-to-end workflow in the product.

```mermaid
sequenceDiagram
    participant Client
    participant ChatHub
    participant ChatStore
    participant AIOrch as AI Orchestration Service
    participant AI as LLM Provider
    participant FileStore
    participant ActionRepo

    Client->>ChatHub: SendMessage(content, attachmentIds)
    ChatHub->>ChatStore: Load or create active session
    ChatHub->>ChatStore: Persist user message
    ChatHub-->>Client: OnProcessingStarted

    ChatHub->>AIOrch: Process request
    AIOrch->>AIOrch: Build prompt from folder context + message + attachments
    AIOrch->>AI: Submit completion request

    loop While streaming
        AI-->>AIOrch: Token chunk
        AIOrch-->>Client: OnMessageChunk
    end

    AI-->>AIOrch: Final response
    AIOrch->>AIOrch: Parse classification decisions
    AIOrch-->>Client: OnClassificationResult

    AIOrch->>ActionRepo: Create action record

    loop For each decision
        alt New folder required
            AIOrch->>FileStore: Create folder
            AIOrch-->>Client: OnFolderCreated
            AIOrch->>ActionRepo: Append FolderCreated item
        end

        AIOrch->>FileStore: Create or move file
        AIOrch-->>Client: OnFileCreated or OnFileMoved
        AIOrch->>ActionRepo: Append action item
    end

    AIOrch->>ChatStore: Persist AI message
    ChatHub-->>Client: OnMessageCompleted
    ChatHub-->>Client: OnProcessingCompleted
```

### Rollback Flow

Rollback is modeled as a deterministic reversal of a recorded AI action, not as a best-effort filesystem diff.

```mermaid
sequenceDiagram
    participant Client
    participant ActionsController
    participant RollbackSvc
    participant ActionRepo
    participant FileStore

    Client->>ActionsController: POST /api/actions/{actionId}/rollback
    ActionsController->>ActionRepo: Load action with items
    ActionsController->>RollbackSvc: Execute rollback

    loop Reverse action items
        alt FileCreated
            RollbackSvc->>FileStore: Delete file
        else FileMoved
            RollbackSvc->>FileStore: Move file back
        else FolderCreated
            RollbackSvc->>FileStore: Delete folder if empty
        end
    end

    RollbackSvc->>ActionRepo: Mark action as rolled back
    ActionsController-->>Client: RollbackResultDto
```

### Cancellation Flow

Cancellation interrupts in-flight AI work and prevents partial results from being treated as complete output.

```mermaid
sequenceDiagram
    participant Client
    participant ChatHub
    participant AIOrch as AI Orchestration Service
    participant AI as LLM Provider
    participant ChatStore

    Client->>ChatHub: CancelProcessing()
    ChatHub->>AIOrch: Signal CancellationToken
    AIOrch->>AI: Abort HTTP request
    AI-->>AIOrch: OperationCancelledException
    AIOrch->>AIOrch: Discard partial result state
    AIOrch->>ChatStore: Persist cancellation message
    ChatHub-->>Client: OnProcessingCancelled
```

## Component Map

```mermaid
flowchart TB
    subgraph Client
        UI[SPA Client]
    end

    subgraph Transport
        HTTP[REST]
        WS[SignalR]
    end

    subgraph WebAPI[ShuKnow.WebAPI]
        Controllers[REST Controllers]
        Hub[ChatHub]
        Middleware[Auth + Error Handling]
    end

    subgraph Application[ShuKnow.Application]
        Identity[IIdentityService]
        Files[File and Folder Services]
        Chat[IChatService]
        Settings[ISettingsService]
        AIOrch[IAIOrchestrationService]
        Rollback[IRollbackService]
        CurrentUser[ICurrentUserService]
    end

    subgraph Domain[ShuKnow.Domain]
        User[User]
        Folder[Folder]
        FileEntity[FileEntity]
        Session[ChatSession]
        Action[Action + ActionItem]
        UserSettings[UserSettings]
        Attachment[Attachment]
    end

    subgraph Infrastructure[ShuKnow.Infrastructure]
        UserRepo[IUserRepository]
        FileStore[IFileSystemStore]
        ChatStore[IChatSessionStore]
        ActionRepo[IActionRepository]
        SettingsRepo[ISettingsRepository]
        AIService[IAIService]
    end

    subgraph External
        DB[(PostgreSQL)]
        LLM[LLM Provider]
    end

    UI --> HTTP
    UI --> WS

    HTTP --> Middleware --> Controllers
    WS --> Middleware --> Hub

    Controllers --> Identity
    Controllers --> Files
    Controllers --> Chat
    Controllers --> Settings
    Controllers --> Rollback
    Hub --> AIOrch

    Controllers -.-> CurrentUser
    Hub -.-> CurrentUser

    Identity --> UserRepo
    Files --> FileStore
    Chat --> ChatStore
    Settings --> SettingsRepo
    Rollback --> ActionRepo
    Rollback --> FileStore
    AIOrch --> AIService
    AIOrch --> ChatStore
    AIOrch --> FileStore
    AIOrch --> ActionRepo

    UserRepo --> DB
    FileStore --> DB
    ChatStore --> DB
    ActionRepo --> DB
    SettingsRepo --> DB
    AIService --> LLM
```

## Key Architectural Decisions

### Attachments Are Uploaded via REST

SignalR is not a good transport for binary payloads of practical size. Attachment upload stays on REST because `multipart/form-data` is reliable, browser-friendly, and easier to validate and limit.

### Chat Sending Uses SignalR Instead of REST

AI processing is long-running and benefits from incremental feedback. SignalR enables token streaming, progress events, file mutation notifications, and cancellation without turning a single HTTP request into a fragile polling workflow.

### Chat Message History Uses Cursor Pagination

Messages are append-only and frequently read from newest to oldest. Cursor pagination avoids unstable pages when new messages arrive during browsing.

### Rollback Uses an Explicit Action Aggregate

Every AI run records what changed. Rollback then reverses that record in a predictable order. This is more auditable and safer than reconstructing changes from timestamps or snapshots.

### Folder Tree Is Loaded as a Tree, Files Are Paginated Separately

The folder tree supports navigation and AI context building, so loading it as a single structure keeps the client model simple. Files can grow much faster than folders, so file listings remain paginated.

### AI Settings Validation Is a Separate Operation

Testing provider connectivity before the first real AI request gives faster feedback and avoids mixing configuration failures with business workflows.

## Domain Gaps Required by the API Design

The current contract implies several domain and persistence capabilities that must exist for the architecture to be complete.

| Area | Required addition | Why it exists |
|---|---|---|
| Folder ordering | `Folder.SortOrder` | Required for sibling reorder operations. |
| User AI config | `UserSettings` with encrypted API key and `LastTestedAt` | Required for per-user LLM configuration. |
| Rollback log | `Action` aggregate with `ActionItem` children | Required for deterministic rollback. |
| Temporary attachments | `Attachment` staging entity | Required because attachments are uploaded before `SendMessage`. |
| File move history | Original location tracking inside action items | Required so rollback can restore moved files. |

## Boundaries and Ownership

- OpenAPI and AsyncAPI define the external contracts.
- This document defines the intended behavior around those contracts.
- If the contracts change, update the YAML files first and then adjust this document only when the runtime model or architectural reasoning also changes.