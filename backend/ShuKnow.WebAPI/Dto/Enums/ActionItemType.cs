using System.Text.Json.Serialization;

namespace ShuKnow.WebAPI.Dto.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ActionItemType
{
    Unknown = 0,
    FileCreated = 1,
    FileMoved = 2,
    FolderCreated = 3
}
