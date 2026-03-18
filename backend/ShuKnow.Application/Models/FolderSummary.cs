namespace ShuKnow.Application.Models;

public record FolderSummary(
    Guid Id,
    string Name,
    string Description,
    Guid? ParentFolderId);