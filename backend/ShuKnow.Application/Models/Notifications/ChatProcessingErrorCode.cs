namespace ShuKnow.Application.Models.Notifications;

public enum ChatProcessingErrorCode
{
    LlmConnectionFailed,
    LlmRateLimited,
    LlmInvalidResponse,
    ClassificationParseError,
    FileOperationFailed,
    InternalError
}
