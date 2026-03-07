namespace ShuKnow.WebAPI.Dto.Actions;

public enum RollbackItemType
{
    FileDeleted,
    FileMovedBack,
    FolderDeleted
}

public record RollbackItemDto(
    RollbackItemType Type,
    string Description);
