using Ardalis.Result;
using Ardalis.Result.AspNetCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.WebAPI.Dto.Settings;
using ShuKnow.WebAPI.Mappers;
using ShuKnow.WebAPI.Requests.Settings;

namespace ShuKnow.WebAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SettingsController(ISettingsService settingsService) : ControllerBase
{
    [HttpGet("ai")]
    public async Task<ActionResult<AiSettingsDto>> GetAiSettings(CancellationToken ct)
    {
        return (await settingsService.GetOrCreateAsync(ct))
            .Map(settings => settings.ToDto())
            .ToActionResult(this);
    }

    [HttpPut("ai")]
    public async Task<ActionResult<AiSettingsDto>> UpdateAiSettings(
        [FromBody] UpdateAiSettingsRequest request,
        CancellationToken ct)
    {
        return (await Result.Success(request)
            .Map(settings => settings.ToInput())
            .BindAsync(input => settingsService.UpdateAsync(input, ct)))
            .Map(settings => settings.ToDto())
            .ToActionResult(this);
    }

    [HttpPost("ai/test")]
    public async Task<ActionResult<AiConnectionTestDto>> TestAiConnection(CancellationToken ct)
    {
        return (await settingsService.TestConnectionAsync(ct))
            .Map(test => test.ToDto())
            .ToActionResult(this);
    }
}
