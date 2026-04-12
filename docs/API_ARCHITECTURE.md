# Обзор архитектуры API

## Назначение

Этот документ объясняет архитектуру API в её текущем состоянии на ветке `66-aiservice`.

- [`docs/openapi.yaml`](C:\Users\Fey\Desktop\coding\pp\ppshu\docs\openapi.yaml) остаётся источником истины для REST-контрактов.
- [`docs/asyncapi.yaml`](C:\Users\Fey\Desktop\coding\pp\ppshu\docs\asyncapi.yaml) остаётся источником истины для intended SignalR-контракта.
- Этот документ фокусируется на runtime-поведении, внутренних границах и branch-specific расхождениях между публичным контрактом и текущей реализацией.

## Обзор системы

ShuKnow по-прежнему использует два transport-style:

- REST для аутентификации, операций с папками и файлами, чтения chat history, загрузки вложений, управления настройками и rollback-endpoints.
- SignalR для предполагаемого long-running chat workflow.

На этой ветке изменился внутренний AI runtime:

- Старый orchestration pipeline удалён.
- В Infrastructure добавлен новый conversation-layer на базе Tornado.
- Публичный SignalR-контракт пока не обновлён, а `ChatHub` всё ещё остаётся stub-ом.

Аутентификация остаётся общей для обоих transport-слоёв:

- HTTP-эндпоинты принимают JWT через `Authorization: Bearer` или через cookie-flow.
- SignalR-соединения по-прежнему используют query-параметр `access_token` и тот же JWT validation pipeline.

## Текущие runtime-flow

### 1. Tornado AI Message Processing Flow

Это текущий внутренний AI-flow, реально реализованный в коде. Он ещё не подключён к публичному `ChatHub`.

```mermaid
sequenceDiagram
    participant Caller as Контроллер или будущий ChatHub
    participant Settings as ISettingsService
    participant AI as TornadoAiService
    participant Prompt as TornadoPromptBuilder
    participant Chat as IChatService
    participant Attach as IAttachmentService
    participant Blob as Blob Storage
    participant Conv as Tornado Conversation
    participant Tools as TornadoToolsService
    participant ToolPort as IAiToolsService
    participant LLM as LLM Provider

    Caller->>Settings: Загрузить AI-настройки пользователя
    Caller->>AI: ProcessMessageAsync(content, attachmentIds, settings)
    AI->>Chat: Получить или создать активную сессию
    AI->>Conv: Создать tool-enabled conversation
    AI->>Prompt: Создать system instructions
    Prompt->>Chat: Загрузить предыдущие сообщения
    AI->>Conv: Добавить system instructions
    AI->>Conv: Добавить предыдущие сообщения

    alt Есть вложения
        Prompt->>Attach: Загрузить метаданные вложений
        Prompt->>Blob: Загрузить attachment blobs
        Prompt-->>AI: Построить multimodal message parts
    end

    AI->>Conv: Добавить user message parts

    loop До сходимости или 10 итераций
        Conv->>LLM: Запросить следующий ответ
        LLM-->>Conv: Текст и optional function calls
        alt Возвращены function calls
            Conv->>Tools: Диспетчеризовать tool calls
            Tools->>ToolPort: Выполнить domain operation
        else Возвращён финальный текст
            Conv-->>AI: Финальный AI response
        end
    end

    AI->>Chat: Сохранить пользовательское сообщение
    AI->>Chat: Сохранить AI-сообщение
```

Ключевые свойства этого flow:

- Он conversation-based, а не parser-based.
- Он использует model tool calls вместо prompt parsing в промежуточный classification object.
- Он сохраняет только финальное пользовательское сообщение и финальный AI-ответ.
- Он сейчас не отправляет `OnMessageChunk`, `OnClassificationResult`, `OnFileCreated`, `OnFolderCreated` и другие hub-уведомления.

### 2. AI Connection Test Flow

Путь тестирования настроек тоже изменился на этой ветке.

```mermaid
sequenceDiagram
    participant Client
    participant SettingsController
    participant SettingsService
    participant AI as TornadoAiService
    participant Factory as TornadoConversationFactory
    participant LLM as LLM Provider

    Client->>SettingsController: POST /api/settings/ai/test
    SettingsController->>SettingsService: TestConnectionAsync()
    SettingsService->>AI: TestConnectionAsync(settings)
    AI->>Factory: Create simple conversation
    Factory->>LLM: Собрать provider client и отправить probe message
    LLM-->>AI: Простой ответ
    AI-->>SettingsService: Обновлённый UserAiSettings с success/error + latency
    SettingsService->>SettingsService: Persist updated settings
    SettingsController-->>Client: success, latencyMs, errorMessage
```

Ключевые свойства:

- Latency измеряется по реальному conversation round-trip.
- Неуспешные тесты теперь сохраняют `LastTestSuccess = false`, `LastTestLatencyMs = null` и текст ошибки.
- Optional base URL валидируется до создания provider client.

### 3. Rollback Flow

Rollback по-прежнему следует старой action-log архитектуре:

```mermaid
sequenceDiagram
    participant Client
    participant ActionsController
    participant RollbackSvc
    participant ActionRepo
    participant FileStore

    Client->>ActionsController: POST /api/actions/{actionId}/rollback
    ActionsController->>ActionRepo: Загрузить action с items
    ActionsController->>RollbackSvc: Выполнить rollback

    loop Reverse action items
        alt FileCreated
            RollbackSvc->>FileStore: Удалить файл
        else FileMoved
            RollbackSvc->>FileStore: Переместить файл обратно
        else FolderCreated
            RollbackSvc->>FileStore: Удалить папку, если она пуста
        end
    end

    RollbackSvc->>ActionRepo: Пометить action как rolled back
    ActionsController-->>Client: Rollback result
```

Текущий gap:

- Новый Tornado AI-path сейчас не создаёт action-records, поэтому rollback-подсистема остаётся целой, но не подключена к новым AI-triggered операциям.

## Карта компонентов

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
        Hub[ChatHub - placeholder]
        Middleware[Auth + Error Handling]
    end

    subgraph Application[ShuKnow.Application]
        Identity[IIdentityService]
        Folders[IFolderService]
        Files[IFileService]
        TextFiles[ITextFileService]
        Chat[IChatService]
        Attachments[IAttachmentService]
        Settings[ISettingsService]
        AiTools[IAiToolsService]
        Rollback[IRollbackService]
        ActionTracking[IActionTrackingService]
        CurrentUser[ICurrentUserService]
    end

    subgraph Infrastructure[ShuKnow.Infrastructure]
        TornadoAI[TornadoAiService / IAiService]
        Prompt[TornadoPromptBuilder]
        ToolRegistry[TornadoToolsService]
        Factory[ITornadoConversationFactory]
        BlobStore[IBlobStorageService]
        SettingsRepo[ISettingsRepository]
        Repos[EF Core repositories]
    end

    subgraph External
        DB[(PostgreSQL)]
        LLM[LLM Provider]
        Blob[(File system or S3)]
    end

    UI --> HTTP
    UI --> WS

    HTTP --> Middleware --> Controllers
    WS --> Middleware --> Hub

    Controllers --> Identity
    Controllers --> Folders
    Controllers --> Files
    Controllers --> Chat
    Controllers --> Settings
    Controllers --> Rollback
    Controllers -.-> CurrentUser
    Hub -.-> CurrentUser

    Controllers --> TornadoAI
    Hub -. planned future wiring .-> TornadoAI

    TornadoAI --> Chat
    TornadoAI --> Prompt
    TornadoAI --> ToolRegistry
    TornadoAI --> Factory
    Prompt --> Attachments
    Prompt --> BlobStore
    ToolRegistry --> AiTools

    Repos --> DB
    SettingsRepo --> DB
    BlobStore --> Blob
    Factory --> LLM
```

## Ключевые архитектурные решения

### AI runtime переключился с prompt parsing на tool calling

На этой ветке удалён orchestration pipeline, который зависел от prompt preparation и classification parsing. Новый путь использует `LlmTornado` conversations и model tool calls.

Следствия:

- Модель может проходить через несколько tool-turn до выдачи финального ответа.
- Исполнение tool calls стало явным port-ом (`IAiToolsService`), а не неявным результатом parser-а.
- Ответ модели больше не обязан следовать parser-friendly текстовому формату.

### Вложения остаются REST-concern, но становятся multimodal chat parts

Вложения по-прежнему загружаются через REST и staging-ся в backend. Новый AI-path преобразует их в Tornado `ChatMessagePart`:

- изображения становятся image-part;
- аудио становится audio-part, если MIME type поддерживается;
- остальное становится document-part.

### Тест соединения использует тот же conversation stack, что и реальные запросы

`TestConnectionAsync()` теперь проходит через тот же provider-selection, decrypt и conversation setup, что и обычная обработка сообщений. Это уменьшает число ложноположительных результатов поверхностных connectivity-check.

### Публичный SignalR-контракт опережает текущую реализацию

`docs/asyncapi.yaml` всё ещё описывает intended chat workflow, включая progress- и streaming-events. На этой ветке [`ChatHub`](C:\Users\Fey\Desktop\coding\pp\ppshu\backend\ShuKnow.WebAPI\Hubs\ChatHub.cs) по-прежнему отправляет placeholder-events и не вызывает новый `IAiService`.

## Текущие gaps ветки

| Область | Текущее состояние на `66-aiservice` | Влияние |
|---|---|---|
| Wiring ChatHub | `SendMessage()` и `CancelProcessing()` остаются TODO-stub | SignalR runtime пока не использует новый AI flow |
| Port AI tool execution | `IAiToolsService` не имеет реализации и DI-регистрации | `TornadoAiService` пока нельзя успешно разрешить в production DI |
| Path-based content operations | `IFileService.GetByPathAsync()`, `IFolderService.GetByPathAsync()` и `IFolderService.CreateByPathAsync()` объявлены, но не реализованы | Tool-driven folder/file операции пока неполны |
| Абстракция текстовых файлов | `ITextFileService` существует только как интерфейс | Text editing tools не имеют concrete service |
| Интеграция action tracking | Новый AI flow не записывает actions | Rollback остаётся доступен только для старых action-based flow |
| Streaming notifications | `IChatNotificationService` больше не участвует в активном AI-path | AsyncAPI пока опережает фактическое runtime-поведение |

## Границы и ответственность

- OpenAPI и AsyncAPI по-прежнему задают intended public contracts.
- Текущая branch implementation перенесла значимую часть AI-поведения в Infrastructure.
- Для branch-accurate runtime-поведения стоит ориентироваться на код и этот документ, а не на старые orchestration-based описания.
