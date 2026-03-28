namespace ShuKnow.WebAPI.Dto.Folders;

public record FolderDto(
    Guid Id,
    string Name,
    string Description,
    string? Emoji,
    Guid? ParentFolderId,
    int SortOrder,
    int FileCount,
    bool HasChildren,
    IReadOnlyList<string>? Path);
