namespace ShuKnow.Application.Models.Notifications;

public record ProcessingFailedNotification(
    Guid OperationId,
    string Error,
    string? ErrorCode = null);
