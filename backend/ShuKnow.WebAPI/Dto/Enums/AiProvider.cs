using System.Text.Json.Serialization;

namespace ShuKnow.WebAPI.Dto.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AiProvider
{
    Unknown = 0,
    OpenAI = 1,
    OpenRouter = 2,
    Gemini = 3
}
