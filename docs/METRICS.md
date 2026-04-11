# Metrics collection approach

## Overview

ShuKnow exposes a single Prometheus scrape endpoint:

- `/metrics`

Product events are recorded in application code through `IMetricsService`, then exported as counters via OpenTelemetry.  
Redis is used as **ephemeral state storage** between events to deduplicate and attribute events correctly (it is not a long-term metrics storage).

## Event model

Domain event type is standardized with `EventType` enum (`ShuKnow.Metrics/Events/EventType.cs`):

- `Unknown`
- `ContentSaved`
- `AiItemProcessed`
- `ManualMove`
- `ContentOpened`

Only these event types are currently used in runtime flow.

## Redis state (for metric correctness)

Prefix: `metrics:*`

- `metrics:item:{itemId}` -> item save timestamp (TTL = `Metrics:RetrievalWindow`, default 30d)
- `metrics:item:{itemId}:ai` -> marker that item was AI-processed (TTL = retrieval window)
- `metrics:item:{itemId}:moved` -> first manual move marker (TTL = retrieval window)
- `metrics:item:{itemId}:retrieved` -> first retrieval marker within window (TTL = retrieval window)
- `metrics:user:{userId}:first_save` -> first save timestamp for retention cohort (TTL = `Metrics:RetentionWeekEnd`, default 14d)
- `metrics:user:{userId}:returned` -> marker that user returned in week 2 (TTL = retention week end)

## Exported counters

- `shuknow_events_total{event_type=...}`
- `shuknow_ai_items_processed_total`
- `shuknow_ai_items_manually_moved_total`
- `shuknow_content_items_saved_total`
- `shuknow_content_access_total{access_type=...}`
- `shuknow_content_retrieved_30d_total`
- `shuknow_retention_cohort_total`
- `shuknow_retention_returned_total`

## KPI calculations in PromQL

1. AI Success Rate

```promql
1 - (
  sum(increase(shuknow_ai_items_manually_moved_total[30d]))
  /
  clamp_min(sum(increase(shuknow_ai_items_processed_total[30d])), 1)
)
```

2. Content Retrieval Rate

```promql
sum(increase(shuknow_content_retrieved_30d_total[30d]))
/
clamp_min(sum(increase(shuknow_content_items_saved_total[30d])), 1)
```

3. Retention 1-week (week-2 return over previous week cohort)

```promql
sum(increase(shuknow_retention_returned_total[7d]))
/
clamp_min(sum(increase(shuknow_retention_cohort_total[7d] offset 7d)), 1)
```

## Configuration

`backend/ShuKnow.Host/appsettings*.json`:

- `Metrics:RetrievalWindow` (default `30.00:00:00`)
- `Metrics:RetentionWeekStart` (default `7.00:00:00`)
- `Metrics:RetentionWeekEnd` (default `14.00:00:00`)

