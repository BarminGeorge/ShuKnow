namespace ShuKnow.Application.Models;

public sealed record ResolvedFolderCreationPath(
    string FolderName,
    Guid? ParentFolderId,
    string FullPath);
