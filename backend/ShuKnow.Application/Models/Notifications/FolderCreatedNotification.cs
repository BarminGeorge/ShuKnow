namespace ShuKnow.Application.Models.Notifications;

public record FolderCreatedNotification(
    Guid FolderId,
    string Name,
    string Description,
    string? Emoji,
    Guid? ParentFolderId,
    int SortOrder,
    int FileCount,
    bool HasChildren);
