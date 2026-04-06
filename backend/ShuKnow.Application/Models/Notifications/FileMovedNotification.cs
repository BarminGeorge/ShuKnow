namespace ShuKnow.Application.Models.Notifications;

public record FileMovedNotification(
    Guid FileId,
    Guid FromFolderId,
    Guid ToFolderId);
