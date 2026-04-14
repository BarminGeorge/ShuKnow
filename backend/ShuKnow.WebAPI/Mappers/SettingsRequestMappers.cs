using ShuKnow.Domain.VO;
using ShuKnow.WebAPI.Requests.Settings;
using DomainAiProvider = ShuKnow.Domain.Enums.AiProvider;

namespace ShuKnow.WebAPI.Mappers;

public static class SettingsRequestMappers
{
    public static UpdateAiSettingsInput ToInput(this UpdateAiSettingsRequest request)
    {
        return new UpdateAiSettingsInput(
            request.BaseUrl,
            request.ApiKey,
            request.Provider is null ? null : (DomainAiProvider)request.Provider,
            request.ModelId);
    }
}
