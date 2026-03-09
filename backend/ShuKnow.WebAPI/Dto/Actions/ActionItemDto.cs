using System.Text.Json.Serialization;

namespace ShuKnow.WebAPI.Dto.Actions;

[JsonConverter(typeof(JsonStringEnumConverter))]
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
