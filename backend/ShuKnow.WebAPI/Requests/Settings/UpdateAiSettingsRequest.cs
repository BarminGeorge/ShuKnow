namespace ShuKnow.WebAPI.Requests.Settings;

public record UpdateAiSettingsRequest(
    string BaseUrl,
    string ApiKey);
