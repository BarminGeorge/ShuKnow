using Microsoft.Extensions.Options;
using ShuKnow.Metrics.Configuration;
using ShuKnow.Metrics.Events;
using ShuKnow.Metrics.Instruments;
using ShuKnow.Metrics.Repositories;

namespace ShuKnow.Metrics.Services;

public class MetricsService(
    MetricsInstruments instruments,
    IMetricsRepository redisRepository,
    IOptions<MetricsOptions> options) : IMetricsService
{
    private readonly MetricsOptions options = options.Value;

    public async Task RecordContentSavedAsync(Guid userId, Guid itemId)
    {
        RecordEvent(EventType.ContentSaved);
        instruments.ContentItemsSaved.Add(1);

        await redisRepository.TrySaveItemAsync(itemId, DateTimeOffset.UtcNow, options.RetrievalWindow);
        await TrackRetentionAsync(userId);
    }

    public async Task RecordAiItemProcessedAsync(Guid userId, Guid itemId)
    {
        var now = DateTimeOffset.UtcNow;

        RecordEvent(EventType.AiItemProcessed);
        instruments.AiItemsProcessed.Add(1);
        instruments.ContentItemsSaved.Add(1);

        await redisRepository.TrySaveItemAsync(itemId, now, options.RetrievalWindow);
        await redisRepository.MarkItemAiProcessedAsync(itemId, options.RetrievalWindow);
        await TrackRetentionAsync(userId);
    }

    public async Task RecordManualMoveAsync(Guid itemId)
    {
        RecordEvent(EventType.ManualMove);

        var isAiProcessed = await redisRepository.IsItemAiProcessedAsync(itemId);
        if (!isAiProcessed)
            return;

        var isFirstMove = await redisRepository.TryMarkItemManuallyMovedAsync(itemId, options.RetrievalWindow);

        if (isFirstMove)
            instruments.AiItemsManuallyMoved.Add(1);
    }

    public async Task RecordContentOpenedAsync(Guid itemId)
    {
        await RecordContentAccessAsync(itemId, EventType.ContentOpened);
    }

    private async Task RecordContentAccessAsync(Guid itemId, EventType accessType)
    {
        RecordEvent(accessType);
        instruments.ContentAccessed.Add(1, Tag("access_type", ToAccessTypeLabel(accessType)));

        var savedAt = await redisRepository.GetItemSavedAtAsync(itemId);
        if (savedAt is null)
            return;

        if (DateTimeOffset.UtcNow - savedAt.Value > options.RetrievalWindow)
            return;

        var isFirstRetrieval = await redisRepository.TryMarkItemRetrievedAsync(itemId, options.RetrievalWindow);

        if (isFirstRetrieval)
            instruments.ContentRetrievedWithin30Days.Add(1);
    }

    private async Task TrackRetentionAsync(Guid userId)
    {
        var now = DateTimeOffset.UtcNow;

        var isFirstSave = await redisRepository.TryRegisterFirstSaveAsync(userId, now, options.RetentionWeekEnd);

        if (isFirstSave)
        {
            instruments.RetentionCohortUsers.Add(1);
            return;
        }

        var firstSaveAt = await redisRepository.GetUserFirstSaveAtAsync(userId);
        if (firstSaveAt is null)
            return;

        var elapsed = now - firstSaveAt.Value;
        if (elapsed < options.RetentionWeekStart || elapsed >= options.RetentionWeekEnd)
            return;

        var isFirstReturn = await redisRepository.TryMarkUserReturnedAsync(userId, options.RetentionWeekEnd);

        if (isFirstReturn)
            instruments.RetentionReturnedUsers.Add(1);
    }

    private void RecordEvent(EventType eventType)
    {
        instruments.EventsRecorded.Add(1, Tag("event_type", ToEventTypeLabel(eventType)));
    }

    private static string ToEventTypeLabel(EventType eventType) => eventType switch
    {
        EventType.ContentSaved => "content_saved",
        EventType.AiItemProcessed => "ai_processed",
        EventType.ManualMove => "manual_move",
        EventType.ContentOpened => "content_opened",
        _ => "unknown"
    };

    private static string ToAccessTypeLabel(EventType eventType) => eventType switch
    {
        EventType.ContentOpened => "opened",
        _ => "unknown"
    };

    private static KeyValuePair<string, object?> Tag(string key, string value) => new(key, value);
}
