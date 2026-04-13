namespace ShuKnow.WebAPI.Events;

/// <summary>
/// Event from server to client when AI processing completes successfully.
/// </summary>
public record ProcessingCompletedEvent(Guid OperationId);
