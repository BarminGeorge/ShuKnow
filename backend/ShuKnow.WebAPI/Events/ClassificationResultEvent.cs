namespace ShuKnow.WebAPI.Events;

/// <summary>
/// Event from server to client with AI classification results before file operations.
/// </summary>
public record ClassificationResultEvent(
    Guid OperationId,
    IReadOnlyList<ClassificationDecisionDto> Decisions);
