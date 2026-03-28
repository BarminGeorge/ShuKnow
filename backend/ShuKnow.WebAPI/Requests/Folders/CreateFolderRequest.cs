namespace ShuKnow.WebAPI.Requests.Folders;

public record CreateFolderRequest(
    string Name,
    string? Description = null,
    string? Emoji = null,
    Guid? ParentFolderId = null);
