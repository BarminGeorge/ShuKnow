namespace ShuKnow.WebAPI.Events;

/// <summary>
/// Error codes for processing failures.
/// </summary>
public enum ProcessingErrorCode
{
    LlmConnectionFailed,
    LlmRateLimited,
    LlmInvalidResponse,
    ClassificationParseError,
    FileOperationFailed,
    InternalError
}

/// <summary>
/// Event from server to client when AI processing fails.
/// </summary>
public record ProcessingFailedEvent(
    Guid OperationId,
    string Error,
    ProcessingErrorCode Code);
