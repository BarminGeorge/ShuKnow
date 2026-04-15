namespace ShuKnow.WebAPI.Events;

public record MessageCompletedEvent(
    Guid OperationId,
    Guid MessageId);