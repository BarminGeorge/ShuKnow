namespace ShuKnow.WebAPI.Requests.Folders;

public record MoveFolderRequest(
    Guid? NewParentFolderId = null);
