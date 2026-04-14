using Ardalis.Result;
using Ardalis.Result.AspNetCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.VO;
using ShuKnow.WebAPI.Dto.Settings;
using ShuKnow.WebAPI.Mappers;
using ShuKnow.WebAPI.Requests.Settings;
using DomainAiProvider = ShuKnow.Domain.Enums.AiProvider;

namespace ShuKnow.WebAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SettingsController(ISettingsService settingsService) : ControllerBase
{
    [HttpGet("ai")]
    public async Task<ActionResult<AiSettingsDto>> GetAiSettings(CancellationToken ct)
    {
        var result = await settingsService.GetOrCreateAsync(ct);
        return result
            .Map(settings => settings.ToDto())
            .ToActionResult(this);
    }

    [HttpPut("ai")]
    public async Task<ActionResult<AiSettingsDto>> UpdateAiSettings(
        [FromBody] UpdateAiSettingsRequest request,
        CancellationToken ct)
    {
        var input = new UpdateAiSettingsInput(
            request.BaseUrl,
            request.ApiKey,
            request.Provider is null ? null : (DomainAiProvider)request.Provider,
            request.ModelId);

        var result = await settingsService.UpdateAsync(input, ct);
        return result
            .Map(settings => settings.ToDto())
            .ToActionResult(this);
    }

    [HttpPost("ai/test")]
    public async Task<ActionResult<AiConnectionTestDto>> TestAiConnection(CancellationToken ct)
    {
        var result = await settingsService.TestConnectionAsync(ct);
        return result
            .Map(test => test.ToDto())
            .ToActionResult(this);
    }
}
