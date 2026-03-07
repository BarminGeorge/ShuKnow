namespace ShuKnow.WebAPI.Events;

/// <summary>
/// Event from server to client confirming processing cancellation.
/// </summary>
public record ProcessingCancelledEvent(
    Guid OperationId);
