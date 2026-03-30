using System.Text.Json.Serialization;
using ShuKnow.WebAPI.Utility;

namespace ShuKnow.WebAPI.Dto.Enums;

[JsonConverter(typeof(CaseInsensitiveJsonStringEnumConverter<AiProvider>))]
public enum AiProvider
{
    Unknown = 0,
    OpenAI = 1,
    OpenRouter = 2,
    Gemini = 3,
    Anthropic = 4
}