namespace ShuKnow.WebAPI.Requests.Folders;

public record CreateFolderRequest(
    string Name,
    string? Description = null,
    Guid? ParentFolderId = null);
