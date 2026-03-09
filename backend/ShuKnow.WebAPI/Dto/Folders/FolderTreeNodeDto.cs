namespace ShuKnow.WebAPI.Dto.Folders;

public record FolderTreeNodeDto(
    Guid Id,
    string Name,
    string? Description,
    int SortOrder,
    int FileCount,
    IReadOnlyList<FolderTreeNodeDto> Children);
