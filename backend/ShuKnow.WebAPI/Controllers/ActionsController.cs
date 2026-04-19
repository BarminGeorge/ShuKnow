using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShuKnow.WebAPI.Dto.Actions;

namespace ShuKnow.WebAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ActionsController : ControllerBase
{
    [HttpGet]
    public Task<ActionResult<PagedActionResult>> ListActions(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        // TODO: implement
        return Task.FromResult<ActionResult<PagedActionResult>>(StatusCode(StatusCodes.Status501NotImplemented));
    }

    [HttpGet("{actionId}")]
    public Task<ActionResult<ActionDetailDto>> GetAction(Guid actionId)
    {
        // TODO: implement
        return Task.FromResult<ActionResult<ActionDetailDto>>(StatusCode(StatusCodes.Status501NotImplemented));
    }

    [HttpPost("{actionId}/rollback")]
    public Task<ActionResult<RollbackResultDto>> RollbackAction(Guid actionId)
    {
        // TODO: implement
        return Task.FromResult<ActionResult<RollbackResultDto>>(StatusCode(StatusCodes.Status501NotImplemented));
    }

    [HttpPost("rollback-last")]
    public Task<ActionResult<RollbackResultDto>> RollbackLastAction()
    {
        // TODO: implement
        return Task.FromResult<ActionResult<RollbackResultDto>>(StatusCode(StatusCodes.Status501NotImplemented));
    }
}
