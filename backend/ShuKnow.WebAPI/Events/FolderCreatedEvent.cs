namespace ShuKnow.WebAPI.Events;

/// <summary>
/// Event from server to client when a folder is created.
/// </summary>
public record FolderCreatedEvent(
    Guid FolderId,
    string Name,
    string Description,
    string? Emoji,
    Guid? ParentFolderId,
    int SortOrder);
