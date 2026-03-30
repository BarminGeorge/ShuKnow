using ShuKnow.WebAPI.Dto.Enums;

namespace ShuKnow.WebAPI.Dto.Settings;

public record AiSettingsDto(
    string BaseUrl,
    string ApiKeyMasked,
    AiProvider? Provider,
    string? ModelId,
    bool IsConfigured);
