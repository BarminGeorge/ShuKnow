using System.Text.Json.Serialization;

namespace ShuKnow.WebAPI.Dto.Actions;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum RollbackItemType
{
    FileDeleted,
    FileMovedBack,
    FolderDeleted
}

public record RollbackItemDto(
    RollbackItemType Type,
    string Description);
