namespace ShuKnow.WebAPI.Dto.Actions;

public enum ActionItemType
{
    FileCreated,
    FileMoved,
    FolderCreated
}

public record ActionItemDto(
    ActionItemType Type,
    Guid? FileId,
    Guid? FolderId,
    string? FileName,
    string? FolderName,
    string? TargetFolderName);
