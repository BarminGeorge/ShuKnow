# ShuKnow MVP — Архитектура сервисов

---

## 1. Слой Application: интерфейсы сервисов

Это основные единицы бизнес-логики. Каждый сервис определяется как интерфейс в `ShuKnow.Application`, внедряется в контроллеры или хаб и реализуется в том же слое, при этом инфраструктурные зависимости передаются через порты.

---

### 1.1 ICurrentUserService (реализован)

**Назначение.** Предоставляет identity вызывающего пользователя всем остальным сервисам, не связывая их с деталями транспорта HTTP или SignalR. Каждый сервис, который проверяет владение ресурсом (а это почти все сервисы), зависит именно от него, а не читает `HttpContext` напрямую.

**Методы**

| Метод | Описание |
|---|---|
| `UserId: Guid` | Возвращает ID аутентифицированного пользователя, извлечённый из claim `sub` / `nameidentifier` в JWT. |
| `IsAuthenticated: bool` | Показывает, содержит ли текущий контекст запроса валидную пользовательскую identity. |

---

### 1.2 IIdentityService (реализован)

**Назначение.** Обрабатывает аутентификацию пользователей: регистрацию новых пользователей и вход существующих. Координирует создание identity между доменной сущностью `User` и инфраструктурной записью `IdentityUser`, возвращая JWT-токены при успехе.

**Методы**

| Метод | Описание |
|---|---|
| `RegisterAsync(login, password)` → `Result<string>` | Создаёт новый аккаунт пользователя. Проверяет уникальность логина, хеширует пароль, создаёт записи `IdentityUser` и `User`, возвращает JWT-токен. Возвращает `Conflict`, если логин уже существует. |
| `LoginAsync(login, password)` → `Result<string>` | Аутентифицирует существующего пользователя. Проверяет учётные данные по сохранённому хешу и возвращает JWT-токен при успехе. Возвращает `Unauthorized` при неверных учётных данных. |

**Зависимости**

| Зависимость | Зачем нужна |
|---|---|
| `IIdentityUserRepository` | Сохранение и запрос identity-записей (логин/хеш пароля). |
| `IUserRepository` | Сохранение доменных сущностей пользователей. |
| `IUnitOfWork` | Координация транзакционного сохранения между репозиториями. |
| `IJwtService` | Генерация JWT-токенов при успешной аутентификации. |
| `IPasswordHasher` | Хеширование паролей при регистрации и проверка при входе. |

---

### 1.3 ICurrentConnectionService (реализован)

**Назначение.** Предоставляет текущий ID SignalR-соединения сервисам, которым нужно отправлять адресные real-time-события. Используется `IAIOrchestrationService` для отправки событий прогресса правильному клиентскому соединению.

**Методы**

| Метод | Описание |
|---|---|
| `connectionId: string` | Возвращает текущий ID SignalR-соединения из контекста хаба. |

---

### 1.4 IFolderService

**Назначение.** Управляет полным жизненным циклом виртуальной иерархии папок. Следит за всеми инвариантами на уровне папок: уникальность имени в пределах одного родителя и предотвращение циклов при перемещении.

**Методы**

| Метод | Описание |
|---|---|
| `GetTreeAsync()` → `List<Folder>` | Возвращает полную иерархию папок текущего пользователя. Формирование дерева для UI выполняется на уровне маппинга WebAPI. |
| `GetFolderTreeForPromptAsync()` → `List<FolderSummary>` | Возвращает лёгкие проекции (id, name, description, parent), пригодные для построения AI-промпта. Не загружает полные сущности. Используется `IPromptPreparationService`. |
| `ListAsync(parentId?)` → `List<Folder>` | Плоский список папок на указанном уровне (`root`, если `parentId` равен `null`). Облегчённая альтернатива полному дереву. |
| `GetByIdAsync(folderId)` → `Folder` | Возвращает одну папку с метаданными и массивом `path` с breadcrumb от корня до текущего узла. |
| `GetChildrenAsync(folderId)` → `List<Folder>` | Возвращает прямые дочерние папки. Поддерживает ленивую загрузку раскрытых узлов дерева. |
| `CreateAsync(folder)` → `Folder` | Создаёт сущность папки. Проверяет уникальность имени среди соседних папок. |
| `UpdateAsync(folderId, folder)` → `Folder` | Обновляет изменяемые метаданные папки (имя/описание). Проверяет уникальность имени среди соседних папок. |
| `DeleteAsync(folderId, recursive)` | Удаляет папку. Если `recursive=false` и у папки есть дочерние папки или файлы, возвращает ошибку `409`. |
| `MoveAsync(folderId, newParentId?)` → `Folder` | Перемещает папку к новому родителю или в корень. Проверяет, что не возникает цикл (папка не может стать потомком самой себя) и что имя уникально в целевой области. |
| `ReorderAsync(folderId, position)` | Устанавливает для папки `SortOrder` в указанную позицию с нуля и переиндексирует всех соседей. |

**Зависимости**

| Зависимость | Зачем нужна |
|---|---|
| `IFolderRepository` | Все операции сохранения и чтения сущностей папок. |
| `IFileRepository` | Нужен для рекурсивного удаления (каскад по файлам) и обогащения данными о количестве файлов. |
| `ICurrentUserService` | Ограничение по владельцу: каждый запрос и каждая мутация фильтруются по текущему пользователю. |

---

### 1.5 IFileService

**Назначение.** Управляет CRUD-операциями над метаданными файлов, загрузкой/скачиванием/заменой бинарного содержимого, обновлением текстового содержимого, переупорядочиванием и перемещением файлов между папками. Файлы имеют `SortOrder`, разделяющий общее пространство порядка с соседними папками, что обеспечивает смешанное перетаскивание файлов и папок. Проверяет уникальность имени в пределах папки, применяет ограничения по размеру и делегирует хранение бинарных данных абстракции blob-хранилища.

**Методы**

| Метод | Описание |
|---|---|
| `GetByIdAsync(fileId)` → `File` | Метаданные файла, включая имя папки-владельца. |
| `ListByFolderAsync(folderId, page, pageSize)` → `(List<File> Files, int TotalCount)` | Пагинированный список файлов внутри папки по offset-схеме. |
| `UploadAsync(folderId, file, stream)` → `File` | Сохраняет бинарное содержимое через `IBlobStorageService`, затем сохраняет предоставленную сущность метаданных файла. Проверяет уникальность имени и ограничение по размеру. |
| `UpdateMetadataAsync(fileId, file)` → `File` | Обновляет изменяемые метаданные файла (имя/описание). Проверяет уникальность имени в текущей папке файла. |
| `DeleteAsync(fileId)` | Удаляет запись метаданных и бинарный blob. |
| `GetContentAsync(fileId, rangeStart?, rangeEnd?)` → `(Stream Content, string ContentType, long SizeBytes)` | Стримит бинарное содержимое. Возвращает content type и поддерживает HTTP Range для частичных загрузок. |
| `ReplaceContentAsync(fileId, stream, contentType)` → `File` | Заменяет бинарный blob на месте. Метаданные (имя, описание) не меняются; обновляются `sizeBytes` и `contentType`. |
| `MoveAsync(fileId, targetFolderId)` → `File` | Меняет `FolderId` файла. Проверяет уникальность имени в целевой папке. |
| `ReorderAsync(fileId, position)` | Устанавливает для файла `SortOrder` в указанную позицию с нуля и переиндексирует всех соседей (файлы и папки) внутри родительской папки. |
| `UpdateTextContentAsync(fileId, text)` → `File` | Заменяет содержимое текстового файла из строки. Обновляет `sizeBytes`; остальные метаданные не меняются. |
| `DeleteByFolderAsync(folderId)` | Удаляет все файлы в папке. Используется при рекурсивном удалении папки. |

**Зависимости**

| Зависимость | Зачем нужна |
|---|---|
| `IFileRepository` | Хранение и чтение метаданных. |
| `IFolderRepository` | Проверка существования целевой папки при загрузке и перемещении. |
| `IBlobStorageService` | Хранение и получение бинарного содержимого файлов. |
| `ICurrentUserService` | Ограничение по владельцу. |

---

### 1.6 IChatService

**Назначение.** Управляет моделью одной активной сессии, сохраняет сообщения (пользовательские, AI и сообщения об отмене) и отдаёт историю сообщений с курсорной пагинацией.

**Методы**

| Метод | Описание |
|---|---|
| `GetOrCreateActiveSessionAsync()` → `ChatSession` | Возвращает активную сессию пользователя. Если её нет, создаёт новую. Операция идемпотентна. |
| `DeleteSessionAsync()` | Закрывает/удаляет активную сессию и все её сообщения. Следующий вызов `GetOrCreate` начнёт с чистого листа. |
| `GetMessagesAsync(cursor?, limit)` → `(List<ChatMessage> Messages, string? NextCursor)` | История сообщений с курсорной пагинацией, сначала новые. Курсор непрозрачный (кодирует `CreatedAt` + `Id` для keyset pagination). |
| `PersistUserMessageAsync(sessionId, message, attachmentIds?)` → `ChatMessage` | Сохраняет сущность сообщения пользователя и привязывает подготовленные вложения по ID. Возвращает сохранённую сущность с ID и timestamp, назначенными сервером. |
| `PersistAiMessageAsync(sessionId, message)` → `ChatMessage` | Сохраняет финальный текст AI-ответа. Вызывается сервисом orchestration после завершения стриминга. |
| `PersistCancellationRecordAsync(sessionId, message)` → `ChatMessage` | Сохраняет системное сообщение о том, что AI-ответ был отменён. Это сохраняет целостность таймлайна. |

**Зависимости**

| Зависимость | Зачем нужна |
|---|---|
| `IChatSessionRepository` | CRUD-операции над сессией. |
| `IChatMessageRepository` | Сохранение сообщений и курсорно-пагинированные запросы. |
| `ICurrentUserService` | Ограничение по владельцу. |

---

### 1.7 IAttachmentService

**Назначение.** Подготавливает загрузки файлов, которые будут использованы в будущем вызове `SendMessage` через хаб. Вложения представляют собой временную staging-зону — они существуют потому, что стандартный лимит сообщения SignalR в 32 КБ делает его непригодным для передачи бинарных данных, поэтому файлы должны сначала приходить через REST, а уже затем упоминаться в сообщении чата по ID.

**Методы**

| Метод | Описание |
|---|---|
| `UploadAsync(attachments, contents)` → `List<ChatAttachment>` | Сохраняет предварительно созданные метаданные вложений с соответствующими потоками содержимого. WebAPI маппит multipart-загрузки в этот контракт. Возвращает ID для дальнейшего использования. |
| `GetByIdsAsync(attachmentIds)` → `List<ChatAttachment>` | Получает сущности вложений вместе с их storage keys. Используется orchestration-сервисом для построения AI-prompts. Проверяет, что все ID принадлежат текущему пользователю и ещё не были использованы. |
| `MarkConsumedAsync(attachmentIds)` | Помечает вложения как использованные, чтобы их нельзя было повторно использовать или удалить как просроченные. Вызывается после успешной привязки к сообщению чата. |
| `PurgeExpiredAsync()` | Удаляет вложения старше 1 часа, которые так и не были использованы. Предназначен для вызова фоновой задачей или hosted service. |

**Зависимости**

| Зависимость | Зачем нужна |
|---|---|
| `IAttachmentRepository` | Хранение и чтение метаданных вложений. |
| `IBlobStorageService` | Хранение бинарного содержимого. |
| `ICurrentUserService` | Проверка владельца. |

---

### 1.8 ISettingsService

**Назначение.** Управляет пользовательской конфигурацией AI/LLM-провайдера (base URL, API key, провайдер как enum `AiProvider` и ID модели). Предоставляет проверку соединения.

**Методы**

| Метод | Описание |
|---|---|
| `GetAsync()` → `UserAiSettings?` | Возвращает текущую конфигурацию, включая `Provider` и `ModelId`. |
| `UpdateAsync(settings)` → `UserAiSettings` | Сохраняет или перезаписывает base URL, API key, провайдер и ID модели. Шифрует API key перед сохранением. |
| `TestConnectionAsync()` → `(bool Success, int? LatencyMs, string? ErrorMessage)` | Расшифровывает сохранённый API key, отправляет минимальный probe-запрос к настроенному LLM endpoint и возвращает результат теста. Возвращает ошибку валидации, если настройки ещё не заданы. |

**Зависимости**

| Зависимость | Зачем нужна |
|---|---|
| `ISettingsRepository` | Хранение `UserSettings`. |
| `IEncryptionService` | Шифрование API key при записи и расшифровка при чтении (для теста и для AI-запросов). |
| `IAIService` | Отправка probe-запроса при `TestConnectionAsync`. |
| `ICurrentUserService` | Ограничение по владельцу. |

---

### 1.9 IAIOrchestrationService

**Назначение.** Это центральный оркестратор AI-пайплайна классификации — самый сложный сервис в системе. Вызывается исключительно из `ChatHub`.

**Методы**

| Метод | Описание |
|---|---|
| `ProcessMessageAsync(content, context?, attachmentIds?, callerConnectionId, cancellationToken)` | Выполняет полный pipeline классификации (описан ниже). Возвращает статус операции (`Result`), а весь пользовательский вывод отправляется как события через `IChatNotificationService`. `CancellationToken` проверяется на каждой асинхронной границе, чтобы `CancelProcessing` мог корректно прервать поток. |

**Внутренний pipeline (один метод, несколько стадий):**

1. **Разрешение сессии.** Загружает или создаёт активную chat-сессию через `IChatService`.
2. **Сохранение пользовательского сообщения.** Сохраняет сущность сообщения пользователя и привязывает вложения по ID через `IChatService`.
3. **Отправка `OnProcessingStarted`.** Генерирует `operationId` (GUID), который связывает все последующие события этого запуска.
4. **Получение настроек.** Загружает и расшифровывает AI-конфигурацию пользователя через `ISettingsService`. Если она не настроена, завершается ошибкой `LLM_CONNECTION_FAILED`.
5. **Построение prompt.** Делегирует в `IPromptPreparationService.PrepareAsync()`, который внутри:
   - Загружает дерево папок пользователя (через `IFolderService.GetFolderTreeForPromptAsync()`), чтобы AI видел существующие категории.
   - Разрешает содержимое вложений по ID (через `IAttachmentService`), чтобы предоставить материал для классификации.
   - Собирает финальный текст промпта (через `IPromptBuilder`).
6. **Потоковый вызов LLM.** Вызывает `IAIService.StreamCompletionAsync()` с prompt и расшифрованными пользовательскими учётными данными. Для каждого полученного token chunk отправляет `OnMessageChunk`. Полный текст ответа накапливается.
7. **Парсинг классификации.** Передаёт полный ответ в `IClassificationParser`, чтобы извлечь структурированные решения (имя файла → целевая папка, флаг создания новой папки). Отправляет `OnClassificationResult`.
8. **Создание записи действия.** Создаёт запись действия через `IActionTrackingService.BeginActionAsync()`, чтобы начать записывать мутации.
9. **Цикл исполнения решений.** Для каждого решения классификации:
   - Если целевая папка не существует, создаёт её через `IFolderService`, отправляет `OnFolderCreated`, записывает через `IActionTrackingService.RecordFolderCreatedAsync()`.
   - Создаёт файл в целевой папке (из содержимого вложения) через `IFileService`, отправляет `OnFileCreated`, записывает через `IActionTrackingService.RecordFileCreatedAsync()`.
   - Или, если решение означает перенос существующего файла, перемещает его через `IFileService`, отправляет `OnFileMoved`, записывает через `IActionTrackingService.RecordFileMovedAsync()` (с записью исходной папки для отката).
10. **Сохранение AI-сообщения.** Сохраняет полный текст AI-ответа через `IChatService`. Отправляет `OnMessageCompleted`.
11. **Финализация.** Отправляет `OnProcessingCompleted` с `actionId`, summary и количеством объектов.

**Обработка ошибок:** Любое исключение после `OnProcessingStarted` приводит к отправке `OnProcessingFailed` с подходящим кодом ошибки (`LLM_CONNECTION_FAILED`, `LLM_RATE_LIMITED`, `LLM_INVALID_RESPONSE`, `CLASSIFICATION_PARSE_ERROR`, `FILE_OPERATION_FAILED`, `INTERNAL_ERROR`). Частичные мутации, которые уже успели произойти, остаются как есть (пользователь может выполнить rollback через action, если оно уже было создано).

**Обработка отмены:** Когда токен отменяется, сервис прерывает LLM HTTP-запрос, отбрасывает частичное состояние результата, сохраняет запись об отмене в chat-сессии и отправляет `OnProcessingCancelled`.

**Зависимости (10 всего)**

| Зависимость | Зачем нужна |
|---|---|
| `IChatService` | Разрешение сессии, сохранение сообщений. |
| `IPromptPreparationService` | Консолидирует построение промпта: загрузку дерева папок, разрешение вложений и сборку промпта. |
| `ISettingsService` | Загрузка расшифрованных LLM-учётных данных. |
| `IFolderService` | Создание папок во время исполнения решений. |
| `IFileService` | Создание и перемещение файлов во время исполнения решений. |
| `IAIService` | Потоковое получение ответа от LLM. |
| `IActionTrackingService` | Создание действия, запись action items (создание папки, создание файла, перемещение файла). |
| `IClassificationParser` | Преобразование текста LLM в структурированные решения. |
| `IChatNotificationService` | Отправка всех real-time-событий вызывающему клиенту. |
| `ICurrentUserService` | Контекст владельца. |

---

### 1.10 IActionQueryService

**Назначение.** Предоставляет доступ только на чтение к истории AI-действий. Выделен отдельно от `IRollbackService`, потому что просмотр истории действий — это query-задача со своей пагинацией, тогда как rollback — это команда с нетривиальными побочными эффектами.

**Методы**

| Метод | Описание |
|---|---|
| `ListAsync(page, pageSize)` → `(List<Action> Actions, int TotalCount)` | Пагинированный список действий по offset-схеме, сначала новые. Каждый элемент включает summary, количество items и флаг `canRollback`. |
| `GetByIdAsync(actionId)` → `(Action Action, List<ActionItem> Items)` | Полная детализация одного действия, включая все дочерние `ActionItem` (созданные файлы, перемещённые файлы, созданные папки). |

**Зависимости**

| Зависимость | Зачем нужна |
|---|---|
| `IActionRepository` | Чтение action и данных action-item. |
| `ICurrentUserService` | Ограничение по владельцу. |

---

### 1.11 IRollbackService

**Назначение.** Отменяет записанное AI-действие, проходя по его action items в обратном порядке и откатывая каждую мутацию.

**Методы**

| Метод | Описание |
|---|---|
| `RollbackAsync(actionId)` → `UserAction` | Загружает действие, проверяет, что его можно откатить (оно ещё не откатано, а файлы не были изменены после выполнения), разворачивает каждый item в обратном порядке, помечает действие как откатанное и возвращает обновлённый агрегат действия. |
| `RollbackLastAsync()` → `UserAction` | Находит последнее действие, доступное для отката, и делегирует выполнение в `RollbackAsync`. Возвращает `404`, если такого действия нет. |

**Зависимости**

| Зависимость | Зачем нужна |
|---|---|
| `IActionRepository` | Загрузка действия вместе с items для выполнения отката. |
| `IActionTrackingService` | Пометка действия как откатанного после успешного отката. |
| `IFileService` | Удаление и перемещение файлов. |
| `IFolderService` | Удаление папок. |
| `ICurrentUserService` | Проверка владельца. |

---

### 1.12 IPromptPreparationService

**Назначение.** Консолидирует весь пайплайн подготовки промпта в один сервис. Внутри зависит от `IFolderService` (для дерева папок через `GetFolderTreeForPromptAsync`), `IAttachmentService` (для разрешения staged-файлов по ID) и `IPromptBuilder` (для сборки текста). Это снижает количество зависимостей оркестратора с трёх до одной.

**Методы**

| Метод | Описание |
|---|---|
| `PrepareAsync(userMessage, attachmentIds?, contextSession?)` → `PreparedPrompt` | Загружает дерево папок, разрешает вложения по ID, собирает полный LLM-промпт и возвращает `PreparedPrompt` с текстом промпта и списком использованных ID вложений. |

**Зависимости**

| Зависимость | Зачем нужна |
|---|---|
| `IFolderService` | Загрузка дерева папок для контекста промпта через `GetFolderTreeForPromptAsync()`. |
| `IAttachmentService` | Разрешение staged-вложений и их содержимого. |
| `IPromptBuilder` | Сборка финального текста промпта из компонентов. |

---

### 1.13 IPromptBuilder

**Назначение.** Строит LLM prompt из контекстных входных данных. Используется внутри `IPromptPreparationService` — не вызывается оркестратором напрямую.

**Методы**

| Метод | Описание |
|---|---|
| `BuildClassificationPrompt(folderTree, userMessage, attachmentDescriptions, context?)` → `string` | Собирает структурированный prompt, который включает: (1) существующую иерархию папок пользователя с описаниями, (2) сообщение пользователя, (3) метаданные/summary содержимого для каждого вложения, (4) необязательную подсказку контекста и (5) инструкции для AI, чтобы он вернул пригодный для парсинга ответ классификации. |

---

### 1.14 IActionTrackingService

**Назначение.** Управляет жизненным циклом отслеживания действий во время AI-оркестрации. Инкапсулирует write-операции `IActionRepository`, чтобы оркестратор и rollback-сервис не управляли переходами состояний сущностей напрямую.

**Методы**

| Метод | Описание |
|---|---|
| `BeginActionAsync(sessionId, summary)` → `Guid` | Создаёт новую запись действия для указанной chat-сессии. Возвращает ID действия. |
| `RecordFolderCreatedAsync(actionId, folderId, folderName, parentFolderId?)` | Фиксирует, что папка была создана в рамках действия. |
| `RecordFileCreatedAsync(actionId, fileId, folderId, fileName)` | Фиксирует, что файл был создан в рамках действия. |
| `RecordFileMovedAsync(actionId, fileId, sourceFolderId, targetFolderId)` | Фиксирует, что файл был перемещён в рамках действия. |
| `MarkRolledBackAsync(actionId)` | Помечает существующее действие как откатанное. Используется `IRollbackService` после успешного отката. |

**Зависимости**

| Зависимость | Зачем нужна |
|---|---|
| `IActionRepository` | Хранение сущностей action и action-item. |
| `ICurrentUserService` | Контекст владельца при создании действия. |

---

### 1.15 IClassificationParser

**Назначение.** Разбирает текстовый ответ LLM в структурированный список элементов действий. LLM инструктируется (через prompt) использовать определённые tools; этот сервис извлекает и валидирует вызовы этих tools.

**Методы**

| Метод | Описание |
|---|---|
| `Parse(llmResponseText)` → `List<ActionItem>` | Извлекает структурированные элементы действий из текста ответа. |

---

### 1.16 IChatNotificationService

**Назначение.** Абстрагирует транспортный механизм отправки real-time-событий из слоя Application клиенту. Интерфейс определён в Application; реализация находится в WebAPI и использует `IHubContext<ChatHub>`. Эта граница не позволяет типам SignalR утекать в слой Application.

**Методы**

| Метод | Описание |
|---|---|
| `SendProcessingStartedAsync(connectionId, event)` | Сообщает, что AI-обработка началась. |
| `SendMessageChunkAsync(connectionId, event)` | Стримит chunk токенов клиенту. |
| `SendMessageCompletedAsync(connectionId, message)` | Отправляет финальное сохранённое AI-сообщение. |
| `SendClassificationResultAsync(connectionId, event)` | Отправляет план классификации. |
| `SendFileCreatedAsync(connectionId, file)` | Сообщает, что файл был создан. |
| `SendFileMovedAsync(connectionId, event)` | Сообщает, что файл был перемещён. |
| `SendFolderCreatedAsync(connectionId, folder)` | Сообщает, что папка была создана. |
| `SendProcessingCompletedAsync(connectionId, event)` | Сообщает, что все операции завершены. |
| `SendProcessingFailedAsync(connectionId, event)` | Сообщает об ошибке. |
| `SendProcessingCancelledAsync(connectionId, event)` | Подтверждает отмену. |

Все методы принимают `connectionId` (`string`) для адресной отправки в конкретное SignalR-соединение.

**Зависимости (реализация)**

| Зависимость | Зачем нужна |
|---|---|
| `IHubContext<ChatHub>` | Отправка сообщений в конкретные SignalR-соединения. |

---

## 2. Слой Application: интерфейсы портов (контракты инфраструктуры)

Эти интерфейсы определены в `ShuKnow.Application` и реализуются в `ShuKnow.Infrastructure`. Они описывают, что именно приложению нужно от persistence-слоя и внешних систем, не задавая способ реализации.

---

### 2.1 IUserRepository

| Метод | Описание |
|---|---|
| `GetByIdAsync(userId)` → `User?` | Поиск по первичному ключу. |
| `AddAsync(user)` | Сохраняет нового пользователя. |

---

### 2.2 IFolderRepository

| Метод | Описание |
|---|---|
| `GetByIdAsync(folderId, userId)` → `Folder?` | Одна папка с ограничением по владельцу. |
| `GetTreeAsync(userId)` → `List<Folder>` | Все папки пользователя, загруженные плоским списком (дерево строит сервис). |
| `GetChildrenAsync(parentId, userId)` → `List<Folder>` | Прямые дочерние папки. |
| `GetRootFoldersAsync(userId)` → `List<Folder>` | Папки корневого уровня. |
| `GetSiblingsAsync(parentId?, userId)` → `List<Folder>` | Все соседние папки на одном уровне (для переупорядочивания и проверки уникальности). |
| `GetAncestorIdsAsync(folderId)` → `List<Guid>` | Цепочка предков (для проверки циклов при перемещении). |
| `ExistsByNameInParentAsync(name, parentId?, userId, excludeId?)` → `bool` | Проверка уникальности имени в пределах одного родителя. |
| `AddAsync(folder)` | Сохраняет новую папку. |
| `UpdateAsync(folder)` | Обновляет существующую папку. |
| `DeleteAsync(folderId)` | Удаляет одну папку. |
| `DeleteSubtreeAsync(folderId)` | Рекурсивно удаляет папку и всех её потомков. |
| `CountByUserAsync(userId)` → `int` | Возвращает общее количество папок пользователя. |

---

### 2.3 IFileRepository

| Метод | Описание |
|---|---|
| `GetByIdAsync(fileId, userId)` → `File?` | Один файл с ограничением по владельцу. |
| `ListByFolderAsync(folderId, userId, page, pageSize)` → `(List<File>, int totalCount)` | Пагинированный список файлов в папке. |
| `ExistsByNameInFolderAsync(name, folderId, userId, excludeId?)` → `bool` | Проверка уникальности имени в пределах папки. |
| `CountByFolderAsync(folderId)` → `int` | Количество файлов в папке. |
| `AddAsync(file)` | Сохраняет новую файловую сущность. |
| `UpdateAsync(file)` | Обновляет метаданные. |
| `DeleteAsync(fileId)` | Удаляет файловую сущность. |
| `DeleteByFolderAsync(folderId)` | Удаляет все файлы в папке (для рекурсивного удаления папки). |
| `GetByFolderAsync(folderId)` → `List<File>` | Все файлы в папке (для рекурсивного удаления папки — нужны storage keys для удаления blob-объектов). |

---

### 2.4 IChatSessionRepository

| Метод | Описание |
|---|---|
| `GetActiveAsync(userId)` → `ChatSession?` | Возвращает активную сессию пользователя или `null`. |
| `AddAsync(session)` | Сохраняет новую сессию. |
| `DeleteAsync(sessionId)` | Удаляет сессию. |

---

### 2.5 IChatMessageRepository

| Метод | Описание |
|---|---|
| `AddAsync(message)` | Сохраняет сообщение. |
| `GetPageAsync(sessionId, cursor?, limit)` → `(List<ChatMessage>, string? nextCursor)` | Курсорно-пагинированный запрос, сначала новые. Курсор кодирует `(CreatedAt, Id)`. |
| `DeleteBySessionAsync(sessionId)` | Удаляет все сообщения сессии. |

---

### 2.6 IActionRepository

| Метод | Описание |
|---|---|
| `GetByIdWithItemsAsync(actionId, userId)` → `Action?` | Загружает действие вместе со всеми дочерними элементами. |
| `ListAsync(userId, page, pageSize)` → `(List<Action>, int totalCount)` | Пагинированный список действий, сначала новые. |
| `GetLastEligibleAsync(userId)` → `Action?` | Самое последнее действие, для которого `IsRolledBack == false`. |
| `AddAsync(action)` | Сохраняет новое действие (вместе с item-элементами через EF navigation). |
| `AddItemAsync(actionId, item)` | Добавляет элемент действия во время orchestration. |
| `MarkRolledBackAsync(actionId)` | Устанавливает флаг `IsRolledBack`. |

---

### 2.7 ISettingsRepository

| Метод | Описание |
|---|---|
| `GetByUserAsync(userId)` → `UserSettings?` | Загружает настройки пользователя. |
| `UpsertAsync(settings)` | Выполняет insert или update настроек. |

---

### 2.8 IAttachmentRepository

**Назначение.** Хранение сущностей staged-вложений.

| Метод | Описание |
|---|---|
| `GetByIdsAsync(ids, userId)` → `List<Attachment>` | Получает несколько вложений по ID с ограничением по владельцу. |
| `AddRangeAsync(attachments)` | Сохраняет несколько вложений. |
| `MarkConsumedAsync(ids)` | Обновляет статус на consumed. |
| `GetExpiredUnconsumedAsync(olderThan)` → `List<Attachment>` | Используется purge-задачей. |
| `DeleteRangeAsync(ids)` | Удаляет записи вложений. |

---

### 2.9 IAIService

**Назначение.** Низкоуровневое взаимодействие с LLM-провайдером. Это инфраструктурный адаптер, который умеет выполнять HTTP-запросы к OpenAI-совместимым API.

| Метод | Описание |
|---|---|
| `StreamCompletionAsync(prompt, baseUrl, apiKey, cancellationToken)` → `IAsyncEnumerable<string>` | Отправляет completion-запрос и по мере поступления SSE-потока отдаёт чанки токенов. |
| `TestConnectionAsync(baseUrl, apiKey)` → `(bool success, int? latencyMs, string? error)` | Отправляет минимальный запрос (например, список моделей), чтобы проверить соединение и валидность учётных данных. |

**Зависимости**

| Зависимость | Зачем нужна |
|---|---|
| `IHttpClientFactory` | Создание HTTP-клиентов для вызовов LLM API. |

---

### 2.10 IBlobStorageService

**Назначение.** Абстракция хранилища бинарных файлов. Отвязывает приложение от физического механизма хранения (локальная файловая система для MVP, позже облачное blob-хранилище).

| Метод | Описание |
|---|---|
| `SaveAsync(content, file)` | Сохраняет бинарное содержимое, используя метаданные из сущности `File`. |
| `GetAsync(fileId)` → `Stream` | Получает всё бинарное содержимое по ID файла. |
| `GetRangeAsync(fileId, rangeStart, rangeEnd)` → `Stream` | Получает диапазон байтов (для поддержки HTTP Range). |
| `DeleteAsync(fileId)` | Удаляет бинарное содержимое по ID файла. |
| `GetSizeAsync(fileId)` → `long` | Возвращает размер сохранённого содержимого (для Range/Content-Length). |

---

### 2.11 IEncryptionService

**Назначение.** Шифрует и расшифровывает чувствительные данные в покое, в частности API keys для LLM.

| Метод | Описание |
|---|---|
| `Encrypt(plainText)` → `string` | Возвращает зашифрованный ciphertext (например, AES-256-GCM в base64). |
| `Decrypt(cipherText)` → `string` | Возвращает исходный plaintext. |

**Зависимости.** Ключ шифрования (из `IOptions<EncryptionSettings>` или из key vault).

---

## 3. Поток зависимостей

Эту архитектуру удобнее понимать в двух дополняющих друг друга представлениях: как application-сервисы координируются во время выполнения и где завершаются инфраструктурные порты.

### 3.1 Взаимодействие сервисов во время выполнения

```mermaid
flowchart LR
    classDef entry fill:#F4F1DE,stroke:#6B705C,color:#1F2937,stroke-width:1.5px;
    classDef core fill:#E0F2FE,stroke:#1D4ED8,color:#1F2937,stroke-width:1.5px;
    classDef support fill:#FEF3C7,stroke:#B45309,color:#1F2937,stroke-width:1.2px;
    classDef recovery fill:#ECFCCB,stroke:#4D7C0F,color:#1F2937,stroke-width:1.2px;
    classDef transport fill:#FEE2E2,stroke:#B91C1C,color:#1F2937,stroke-width:1.2px;

    Client["Контроллеры / ChatHub"]:::entry

    subgraph App["Слой Application"]
        direction TB

        subgraph Workflow["AI-поток классификации"]
            direction LR
            ChatService["IChatService"]:::core
            SettingsService["ISettingsService"]:::core
            AIOrchestration["IAIOrchestrationService"]:::core
            PromptPrep["IPromptPreparationService"]:::support
            ClassificationParser["IClassificationParser"]:::support
            ActionTracking["IActionTrackingService"]:::support
            ChatNotification["IChatNotificationService"]:::transport
        end

        subgraph PromptInternals["Внутренности подготовки промпта"]
            direction LR
            AttachmentService["IAttachmentService"]:::core
            PromptBuilder["IPromptBuilder"]:::support
        end

        subgraph Content["Организация контента и восстановление"]
            direction LR
            FolderService["IFolderService"]:::core
            FileService["IFileService"]:::core
            ActionQueryService["IActionQueryService"]:::recovery
            RollbackService["IRollbackService"]:::recovery
        end

        subgraph Identity["Identity и контекст запроса"]
            direction LR
            IdentityService["IIdentityService"]:::support
            CurrentUser["ICurrentUserService"]:::support
            CurrentConnection["ICurrentConnectionService"]:::support
        end
    end

    Client -->|авторизация| IdentityService
    Client -->|CRUD папок| FolderService
    Client -->|CRUD файлов| FileService
    Client -->|история чата| ChatService
    Client -->|AI-запрос| AIOrchestration
    Client -->|история действий| ActionQueryService
    Client -->|откат| RollbackService

    AIOrchestration -->|жизненный цикл сессии и сообщений| ChatService
    AIOrchestration -->|подготовка промпта| PromptPrep
    AIOrchestration -->|получение LLM-настроек| SettingsService
    AIOrchestration -->|парсинг ответа модели| ClassificationParser
    AIOrchestration -->|отслеживание action items| ActionTracking
    AIOrchestration -->|создание папок| FolderService
    AIOrchestration -->|создание или перенос файлов| FileService
    AIOrchestration -->|стриминг прогресса и результатов| ChatNotification

    PromptPrep -->|загрузка дерева папок| FolderService
    PromptPrep -->|разрешение вложений| AttachmentService
    PromptPrep -->|сборка текста промпта| PromptBuilder

    RollbackService -->|откат файловых мутаций| FileService
    RollbackService -->|откат мутаций папок| FolderService
    RollbackService -->|пометка откатанным| ActionTracking

    CurrentUser -. identity вызывающего и ownership scope .-> AIOrchestration
    CurrentUser -. identity вызывающего и ownership scope .-> FolderService
    CurrentUser -. identity вызывающего и ownership scope .-> FileService
    CurrentUser -. identity вызывающего и ownership scope .-> ChatService

    ChatNotification -->|адресные SignalR-события| Client
```

### 3.2 Связь портов и инфраструктуры

```mermaid
flowchart LR
    classDef repo fill:#E0F2FE,stroke:#1D4ED8,color:#1F2937,stroke-width:1.3px;
    classDef port fill:#DBEAFE,stroke:#2563EB,color:#1F2937,stroke-width:1.3px;
    classDef helper fill:#FEF3C7,stroke:#B45309,color:#1F2937,stroke-width:1.2px;
    classDef transport fill:#FEE2E2,stroke:#B91C1C,color:#1F2937,stroke-width:1.2px;
    classDef external fill:#F3F4F6,stroke:#6B7280,color:#111827,stroke-width:1.2px,stroke-dasharray: 5 3;

    subgraph Persistence["Порты persistence-слоя"]
        direction TB
        UserRepo["IUserRepository"]:::repo
        IdentityUserRepo["IIdentityUserRepository"]:::repo
        FolderRepo["IFolderRepository"]:::repo
        FileRepo["IFileRepository"]:::repo
        ChatSessionRepo["IChatSessionRepository"]:::repo
        ChatMessageRepo["IChatMessageRepository"]:::repo
        AttachmentRepo["IAttachmentRepository"]:::repo
        SettingsRepo["ISettingsRepository"]:::repo
        ActionRepo["IActionRepository"]:::repo
        UnitOfWork["IUnitOfWork"]:::repo
    end

    subgraph Integrations["Интеграционные порты и вспомогательные сервисы"]
        direction TB
        AIService["IAIService"]:::port
        BlobStorage["IBlobStorageService"]:::port
        Encryption["IEncryptionService"]:::port
        JwtService["IJwtService"]:::port
        PasswordHasher["IPasswordHasher"]:::helper
        ChatNotificationPort["IChatNotificationService"]:::transport
    end

    subgraph Systems["Инфраструктурные реализации / внешние системы"]
        direction TB
        DB[(PostgreSQL)]:::external
        LLM["LLM-провайдер"]:::external
        BlobStore["Файловая система или cloud blob storage"]:::external
        KeyConfig["Ключи, секреты, конфигурация"]:::external
        SignalR["Контекст SignalR-хаба"]:::external
    end

    UserRepo --> DB
    IdentityUserRepo --> DB
    FolderRepo --> DB
    FileRepo --> DB
    ChatSessionRepo --> DB
    ChatMessageRepo --> DB
    AttachmentRepo --> DB
    SettingsRepo --> DB
    ActionRepo --> DB

    AIService --> LLM
    BlobStorage --> BlobStore
    Encryption --> KeyConfig
    JwtService --> KeyConfig
    PasswordHasher --> KeyConfig
    ChatNotificationPort --> SignalR
```
