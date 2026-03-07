namespace ShuKnow.WebAPI.Dto.Settings;

public record AiSettingsDto(
    string BaseUrl,
    string ApiKeyMasked,
    bool IsConfigured);
