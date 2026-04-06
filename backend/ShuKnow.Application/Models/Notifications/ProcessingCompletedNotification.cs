namespace ShuKnow.Application.Models.Notifications;

public record ProcessingCompletedNotification(
    Guid OperationId,
    Guid ActionId,
    string Summary,
    int FilesCreated,
    int FilesMoved);
