namespace ShuKnow.Domain.Entities;

public class UserAiSettings
{
    public Guid UserId { get; private set; }
    public string BaseUrl { get; private set; } = string.Empty;
    public string ApiKeyEncrypted { get; private set; } = string.Empty;
    public bool? LastTestSuccess { get; private set; }
    public int? LastTestLatencyMs { get; private set; }
    public string? LastTestError { get; private set; }

    protected UserAiSettings()
    {
    }

    public UserAiSettings(
        Guid userId,
        string baseUrl,
        string apiKeyEncrypted,
        bool? lastTestSuccess = null,
        int? lastTestLatencyMs = null,
        string? lastTestError = null)
    {
        UserId = userId;
        BaseUrl = baseUrl;
        ApiKeyEncrypted = apiKeyEncrypted;
        LastTestSuccess = lastTestSuccess;
        LastTestLatencyMs = lastTestLatencyMs;
        LastTestError = lastTestError;
    }
}
