using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShuKnow.WebAPI.Dto.Enums;
using ShuKnow.WebAPI.Dto.Settings;
using ShuKnow.WebAPI.Requests.Settings;

namespace ShuKnow.WebAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SettingsController : ControllerBase
{
    [HttpGet("ai")]
    public async Task<ActionResult<AiSettingsDto>> GetAiSettings()
    {
        // TODO: implement
        return new AiSettingsDto("https://api.openai.com/v1", "sk-****abc1", AiProvider.OpenAI, "gpt-4o", true);
    }

    [HttpPut("ai")]
    public async Task<ActionResult<AiSettingsDto>> UpdateAiSettings(
        [FromBody] UpdateAiSettingsRequest request)
    {
        // TODO: implement
        var masked = request.ApiKey.Length > 4
            ? "sk-****" + request.ApiKey[^4..]
            : "sk-****";

        return new AiSettingsDto(request.BaseUrl, masked, request.Provider, request.ModelId, true);
    }

    [HttpPost("ai/test")]
    public async Task<ActionResult<AiConnectionTestDto>> TestAiConnection()
    {
        // TODO: implement
        return new AiConnectionTestDto(true, 342, null);
    }
}