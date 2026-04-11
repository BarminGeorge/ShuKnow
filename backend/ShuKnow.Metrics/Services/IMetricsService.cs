namespace ShuKnow.Metrics.Services;

public interface IMetricsService
{
    Task RecordContentSavedAsync(Guid userId, Guid itemId);
    Task RecordAiItemProcessedAsync(Guid userId, Guid itemId);
    Task RecordManualMoveAsync(Guid itemId);
    Task RecordContentOpenedAsync(Guid itemId);
}
