namespace ShuKnow.Application.Models.Notifications;

public enum ChatProcessingErrorCode
{
    Unknown = 0,
    LlmConnectionFailed,
    LlmRateLimited,
    LlmInvalidResponse,
    ClassificationParseError,
    FileOperationFailed,
    InternalError
}
