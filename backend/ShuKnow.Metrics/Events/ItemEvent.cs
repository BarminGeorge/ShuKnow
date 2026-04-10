namespace ShuKnow.Metrics.Events;

public sealed record ItemEvent(
    Guid? UserId,
    Guid? ItemId,
    EventType EventType,
    DateTimeOffset Timestamp);
