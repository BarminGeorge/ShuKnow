# Метрики продукта в Prometheus (`/metrics`)

## Что реализовано

Кастомные метрики встроены в существующий OpenTelemetry pipeline и отдаются тем же endpoint'ом:

- `GET /metrics` — базовые runtime/http метрики + продуктовые метрики ShuKnow.

Отдельный endpoint для метрик не добавлялся.

## События и где они фиксируются

### Сохранение контента

Вызывает `RecordContentSaved(userId, itemId)`:

- `POST /api/folders/{folderId}/files` (`FoldersController.UploadFile`)
- `POST /api/chat/attachments` (`ChatController.UploadChatAttachments`)
- `PUT /api/files/{fileId}/content` (`FilesController.ReplaceFileContent`)
- `PATCH /api/files/{fileId}/content` (`FilesController.UpdateTextContent`)

### Доступ к контенту (Retrieval)

Вызывает `RecordContentOpened(itemId)`:

- `GET /api/files/{fileId}/content` (`FilesController.DownloadFileContent`)

### Ручное перемещение пользователем

Вызывает `RecordManualMove(itemId)`:

- `PATCH /api/files/{fileId}/move` (`FilesController.MoveFile`)

### AI-обработка элемента

Вызывает `RecordAiItemProcessed(userId, itemId)`:

- `ChatHub.OnFileCreated(FileDto file)`
- `ChatHub.OnFileMoved(FileMovedEvent event)`

## Экспортируемые метрики

### Основные счетчики

- `shuknow_ai_items_processed_total`
- `shuknow_ai_items_manually_moved_after_processing_total`
- `shuknow_content_items_saved_total`
- `shuknow_content_items_retrieved_within_30d_total`

### Дополнительные счетчики

- `shuknow_retention_week1_cohort_users_total`
- `shuknow_retention_week2_returned_users_total`

### Технические счетчики событий

- `shuknow_metric_events_total{event_type=...}`
- `shuknow_content_access_events_total{access_type="opened|copied|link_followed"}`

## PromQL формулы

### 1) AI Success Rate

```promql
clamp_min(
  (
    shuknow_ai_items_processed_total
    - shuknow_ai_items_manually_moved_after_processing_total
  )
  /
  clamp_min(shuknow_ai_items_processed_total, 1),
  0
)
```

### 2) Content Retrieval Rate (30d)

```promql
shuknow_content_items_retrieved_within_30d_total
/
clamp_min(shuknow_content_items_saved_total, 1)
```

### 3) Retention 1-week

```promql
shuknow_retention_week2_returned_users_total
/
clamp_min(shuknow_retention_week1_cohort_users_total, 1)
```

## Важное ограничение текущей реализации

Для корреляции событий по элементам и пользователям используется in-memory состояние процесса.
После перезапуска сервиса состояние сбрасывается, а Prometheus продолжит хранить уже собранные значения счётчиков.
