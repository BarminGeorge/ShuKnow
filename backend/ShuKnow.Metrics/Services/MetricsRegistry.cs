using System.Collections.Concurrent;
using System.Diagnostics.Metrics;
using ShuKnow.Metrics.Events;

namespace ShuKnow.Metrics.Services;

public class MetricsRegistry
{
    private static readonly Meter Meter = new("ShuKnow.Metrics", "1.0.0");
    private static readonly TimeSpan RetrievalWindow = TimeSpan.FromDays(30);
    private static readonly TimeSpan RetentionWeekStart = TimeSpan.FromDays(7);
    private static readonly TimeSpan RetentionWeekEnd = TimeSpan.FromDays(14);

    private readonly Counter<long> eventsRecordedCounter;
    private readonly Counter<long> aiItemsProcessedCounter;
    private readonly Counter<long> aiItemsManuallyMovedCounter;
    private readonly Counter<long> contentItemsSavedCounter;
    private readonly Counter<long> contentAccessedCounter;
    private readonly Counter<long> contentItemsRetrievedWithinThirtyDaysCounter;
    private readonly Counter<long> retentionWeekOneCohortUsersCounter;
    private readonly Counter<long> retentionWeekTwoReturnedUsersCounter;

    private readonly ConcurrentDictionary<Guid, ItemState> itemStates = new();
    private readonly ConcurrentDictionary<Guid, DateTimeOffset> firstContentSaveByUser = new();
    private readonly ConcurrentDictionary<Guid, byte> weekTwoReturnedUsers = new();

    public MetricsRegistry()
    {
        eventsRecordedCounter = Meter.CreateCounter<long>(
            name: "shuknow_metric_events_total",
            unit: "{event}",
            description: "Общее количество зафиксированных продуктовых событий.");

        aiItemsProcessedCounter = Meter.CreateCounter<long>(
            name: "shuknow_ai_items_processed_total",
            unit: "{item}",
            description: "Количество элементов, обработанных AI.");

        aiItemsManuallyMovedCounter = Meter.CreateCounter<long>(
            name: "shuknow_ai_items_manually_moved_after_processing_total",
            unit: "{item}",
            description: "Количество AI-обработанных элементов, которые пользователь потом переместил вручную.");

        contentItemsSavedCounter = Meter.CreateCounter<long>(
            name: "shuknow_content_items_saved_total",
            unit: "{item}",
            description: "Количество сохраненных элементов контента.");

        contentAccessedCounter = Meter.CreateCounter<long>(
            name: "shuknow_content_access_events_total",
            unit: "{access}",
            description: "Количество событий повторного доступа к сохраненному контенту (open/copy/link).");

        contentItemsRetrievedWithinThirtyDaysCounter = Meter.CreateCounter<long>(
            name: "shuknow_content_items_retrieved_within_30d_total",
            unit: "{item}",
            description: "Количество сохраненных элементов, к которым вернулись хотя бы один раз в течение 30 дней.");

        retentionWeekOneCohortUsersCounter = Meter.CreateCounter<long>(
            name: "shuknow_retention_week1_cohort_users_total",
            unit: "{user}",
            description: "Размер недельной когорты: пользователи, впервые сохранившие контент.");

        retentionWeekTwoReturnedUsersCounter = Meter.CreateCounter<long>(
            name: "shuknow_retention_week2_returned_users_total",
            unit: "{user}",
            description: "Пользователи, вернувшиеся и добавившие контент на второй неделе.");
    }

    public void RecordEvent(ItemEvent itemEvent)
    {
        switch (itemEvent.EventType)
        {
            case EventType.ContentSaved:
                if (itemEvent.UserId.HasValue && itemEvent.ItemId.HasValue)
                    RecordContentSaved(itemEvent.UserId.Value, itemEvent.ItemId.Value, itemEvent.Timestamp);
                break;

            case EventType.AiItemProcessed:
                if (itemEvent.UserId.HasValue && itemEvent.ItemId.HasValue)
                    RecordAiItemProcessed(itemEvent.UserId.Value, itemEvent.ItemId.Value, itemEvent.Timestamp);
                break;

            case EventType.ManualMove:
                if (itemEvent.ItemId.HasValue)
                    RecordManualMove(itemEvent.ItemId.Value, itemEvent.Timestamp);
                break;

            case EventType.ContentOpened:
                if (itemEvent.ItemId.HasValue)
                    RecordContentOpened(itemEvent.ItemId.Value, itemEvent.Timestamp);
                break;

            case EventType.ContentCopied:
                if (itemEvent.ItemId.HasValue)
                    RecordContentCopied(itemEvent.ItemId.Value, itemEvent.Timestamp);
                break;

            case EventType.ContentLinkFollowed:
                if (itemEvent.ItemId.HasValue)
                    RecordContentLinkFollowed(itemEvent.ItemId.Value, itemEvent.Timestamp);
                break;
            case EventType.Unknown:
                break;
            default:
                throw new ArgumentOutOfRangeException();
        }
    }

    public void RecordContentSaved(Guid userId, Guid itemId, DateTimeOffset? occurredAt = null)
    {
        var timestamp = occurredAt ?? DateTimeOffset.UtcNow;
        RecordEventCounter(EventType.ContentSaved);
        contentItemsSavedCounter.Add(1);

        itemStates.AddOrUpdate(
            itemId,
            _ => new ItemState(timestamp, false, false, false),
            (_, _) => new ItemState(timestamp, false, false, false));

        TrackRetention(userId, timestamp);
    }

    public void RecordAiItemProcessed(Guid userId, Guid itemId, DateTimeOffset? occurredAt = null)
    {
        var timestamp = occurredAt ?? DateTimeOffset.UtcNow;
        RecordEventCounter(EventType.AiItemProcessed);

        aiItemsProcessedCounter.Add(1);
        contentItemsSavedCounter.Add(1);

        itemStates.AddOrUpdate(
            itemId,
            _ => new ItemState(timestamp, true, false, false),
            (_, _) => new ItemState(timestamp, true, false, false));

        TrackRetention(userId, timestamp);
    }

    public void RecordManualMove(Guid itemId, DateTimeOffset? occurredAt = null)
    {
        RecordEventCounter(EventType.ManualMove);

        while (itemStates.TryGetValue(itemId, out var currentState))
        {
            if (!currentState.IsAiProcessed || currentState.WasMovedManuallyAfterAi)
                return;

            var updatedState = currentState with { WasMovedManuallyAfterAi = true };
            if (!itemStates.TryUpdate(itemId, updatedState, currentState))
                continue;

            aiItemsManuallyMovedCounter.Add(1);
            return;
        }
    }

    public void RecordContentOpened(Guid itemId, DateTimeOffset? occurredAt = null)
    {
        RecordContentAccess(itemId, EventType.ContentOpened, occurredAt);
    }

    public void RecordContentCopied(Guid itemId, DateTimeOffset? occurredAt = null)
    {
        RecordContentAccess(itemId, EventType.ContentCopied, occurredAt);
    }

    public void RecordContentLinkFollowed(Guid itemId, DateTimeOffset? occurredAt = null)
    {
        RecordContentAccess(itemId, EventType.ContentLinkFollowed, occurredAt);
    }

    private void RecordContentAccess(Guid itemId, EventType accessType, DateTimeOffset? occurredAt)
    {
        var timestamp = occurredAt ?? DateTimeOffset.UtcNow;
        RecordEventCounter(accessType);
        contentAccessedCounter.Add(1, new KeyValuePair<string, object?>("access_type", ToAccessTag(accessType)));

        while (itemStates.TryGetValue(itemId, out var currentState))
        {
            if (currentState.WasRetrievedWithin30Days)
                return;

            if (timestamp - currentState.SavedAt > RetrievalWindow)
                return;

            var updatedState = currentState with { WasRetrievedWithin30Days = true };
            if (!itemStates.TryUpdate(itemId, updatedState, currentState))
                continue;

            contentItemsRetrievedWithinThirtyDaysCounter.Add(1);
            return;
        }
    }

    private void TrackRetention(Guid userId, DateTimeOffset timestamp)
    {
        if (firstContentSaveByUser.TryAdd(userId, timestamp))
        {
            retentionWeekOneCohortUsersCounter.Add(1);
            return;
        }

        if (!firstContentSaveByUser.TryGetValue(userId, out var firstSaveAt))
            return;

        var elapsed = timestamp - firstSaveAt;
        if (elapsed < RetentionWeekStart || elapsed >= RetentionWeekEnd)
            return;

        if (weekTwoReturnedUsers.TryAdd(userId, 0))
            retentionWeekTwoReturnedUsersCounter.Add(1);
    }

    private void RecordEventCounter(EventType eventType)
    {
        eventsRecordedCounter.Add(1, new KeyValuePair<string, object?>("event_type", ToEventTag(eventType)));
    }

    private static string ToEventTag(EventType eventType)
    {
        return eventType switch
        {
            EventType.ContentSaved => "content_saved",
            EventType.AiItemProcessed => "ai_item_processed",
            EventType.ManualMove => "manual_move",
            EventType.ContentOpened => "content_opened",
            EventType.ContentCopied => "content_copied",
            EventType.ContentLinkFollowed => "content_link_followed",
            _ => "unknown"
        };
    }

    private static string ToAccessTag(EventType eventType)
    {
        return eventType switch
        {
            EventType.ContentOpened => "opened",
            EventType.ContentCopied => "copied",
            EventType.ContentLinkFollowed => "link_followed",
            _ => "unknown"
        };
    }

    private sealed record ItemState(
        DateTimeOffset SavedAt,
        bool IsAiProcessed,
        bool WasMovedManuallyAfterAi,
        bool WasRetrievedWithin30Days);
}
