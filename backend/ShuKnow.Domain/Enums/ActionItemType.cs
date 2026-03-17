using System.Text.Json.Serialization;

namespace ShuKnow.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ActionItemType
{
    Unknown = 0,
    FileCreated = 1,
    FileMoved = 2,
    FolderCreated = 3
}
