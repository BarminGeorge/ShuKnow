using ShuKnow.Domain.Enums;

namespace ShuKnow.Application.Models;

public record UpdateAiSettingsInput(string BaseUrl, string ApiKey, AiProvider Provider, string ModelId);
