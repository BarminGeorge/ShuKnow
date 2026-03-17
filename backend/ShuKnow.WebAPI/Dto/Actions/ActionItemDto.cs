using ShuKnow.Domain.Enums;

namespace ShuKnow.WebAPI.Dto.Actions;

public record ActionItemDto(
    ActionItemType Type,
    Guid? FileId,
    Guid? FolderId,
    string? FileName,
    string? FolderName,
    string? TargetFolderName);
