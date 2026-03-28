using ShuKnow.WebAPI.Dto.Enums;

namespace ShuKnow.WebAPI.Requests.Settings;

public record UpdateAiSettingsRequest(
    string BaseUrl,
    string ApiKey,
    AiProvider? Provider = null,
    string? ModelId = null);
