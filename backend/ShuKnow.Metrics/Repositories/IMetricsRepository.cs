namespace ShuKnow.Metrics.Repositories;

public interface IMetricsRepository
{
    Task<bool> TrySaveItemAsync(Guid itemId, DateTimeOffset savedAt, TimeSpan ttl);
    Task MarkItemAiProcessedAsync(Guid itemId, TimeSpan ttl);
    Task<bool> IsItemAiProcessedAsync(Guid itemId);
    Task<bool> TryMarkItemManuallyMovedAsync(Guid itemId, TimeSpan ttl);
    Task<DateTimeOffset?> GetItemSavedAtAsync(Guid itemId);
    Task<bool> TryMarkItemRetrievedAsync(Guid itemId, TimeSpan ttl);
    Task<bool> TryRegisterFirstSaveAsync(Guid userId, DateTimeOffset savedAt, TimeSpan ttl);
    Task<DateTimeOffset?> GetUserFirstSaveAtAsync(Guid userId);
    Task<bool> TryMarkUserReturnedAsync(Guid userId, TimeSpan ttl);
}