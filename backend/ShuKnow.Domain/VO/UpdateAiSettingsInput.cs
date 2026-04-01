using ShuKnow.Domain.Enums;

namespace ShuKnow.Domain.VO;

public record UpdateAiSettingsInput(string? BaseUrl, string? ApiKey, AiProvider? Provider, string? ModelId);
