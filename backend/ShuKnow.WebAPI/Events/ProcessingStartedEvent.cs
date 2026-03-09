namespace ShuKnow.WebAPI.Events;

/// <summary>
/// Event from server to client when AI processing starts.
/// </summary>
public record ProcessingStartedEvent(
    Guid OperationId);
