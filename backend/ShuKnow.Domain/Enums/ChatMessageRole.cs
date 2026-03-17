using System.Text.Json.Serialization;

namespace ShuKnow.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ChatMessageRole
{
    Unknown = 0,
    User = 1,
    Ai = 2,
    System = 3
}
