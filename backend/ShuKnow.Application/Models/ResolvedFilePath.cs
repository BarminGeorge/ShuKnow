namespace ShuKnow.Application.Models;

public sealed record ResolvedFilePath(
    string FileName,
    Guid FolderId,
    string FullPath);
