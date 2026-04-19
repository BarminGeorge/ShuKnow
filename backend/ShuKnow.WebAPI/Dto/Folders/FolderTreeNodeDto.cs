namespace ShuKnow.WebAPI.Dto.Folders;

public record FolderTreeNodeDto(
    Guid Id,
    string Name,
    string Description,
    string? Emoji,
    int SortOrder,
    IReadOnlyList<FolderTreeNodeDto> Children);
