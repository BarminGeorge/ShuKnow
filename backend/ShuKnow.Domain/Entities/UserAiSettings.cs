using ShuKnow.Domain.Enums;

namespace ShuKnow.Domain.Entities;

public class UserAiSettings
{
    public Guid UserId { get; private set; }
    public string BaseUrl { get; private set; } = string.Empty;
    public string ApiKeyEncrypted { get; private set; } = string.Empty;
    public AiProvider Provider { get; private set; } = AiProvider.Unknown;
    public string ModelId { get; private set; } = string.Empty;
    public bool? LastTestSuccess { get; private set; }
    public int? LastTestLatencyMs { get; private set; }
    public string? LastTestError { get; private set; }

    protected UserAiSettings()
    {
    }

    public UserAiSettings(
        Guid userId,
        string baseUrl = "",
        string apiKeyEncrypted = "",
        AiProvider provider = AiProvider.Unknown,
        string modelId = "",
        bool? lastTestSuccess = null,
        int? lastTestLatencyMs = null,
        string? lastTestError = null)
    {
        UserId = userId;
        BaseUrl = baseUrl;
        ApiKeyEncrypted = apiKeyEncrypted;
        Provider = provider;
        ModelId = modelId;
        LastTestSuccess = lastTestSuccess;
        LastTestLatencyMs = lastTestLatencyMs;
        LastTestError = lastTestError;
    }

    public void UpdateTestResult(bool success, int latencyMs, string? errorMessage)
    {
        LastTestSuccess = success;
        LastTestLatencyMs = latencyMs;
        LastTestError = errorMessage;
    }

    public void UpdateSettings(string? baseUrl, string? apiKeyEncrypted, AiProvider? provider, string? modelId)
    {
        BaseUrl = baseUrl ?? BaseUrl;
        ApiKeyEncrypted = apiKeyEncrypted ?? ApiKeyEncrypted;
        Provider = provider ?? Provider;
        ModelId = modelId ?? ModelId;
        ClearTestResult();
    }

    public void ClearTestResult()
    {
        LastTestSuccess = null;
        LastTestLatencyMs = null;
        LastTestError = null;
    }
}