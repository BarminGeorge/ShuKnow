using System.Text.Json.Serialization;

namespace ShuKnow.WebAPI.Dto.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ChatSessionStatus
{
    Unknown = 0,
    Active = 1,
    Closed = 2
}
