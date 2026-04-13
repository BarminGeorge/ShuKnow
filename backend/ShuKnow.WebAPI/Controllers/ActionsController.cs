using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShuKnow.WebAPI.Dto.Enums;
using ShuKnow.WebAPI.Dto.Actions;

namespace ShuKnow.WebAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ActionsController : ControllerBase
{
    private static readonly Guid MockActionId = Guid.Parse("c3d4e5f6-a7b8-9012-cdef-123456789012");

    [HttpGet]
    public async Task<ActionResult<PagedActionResult>> ListActions(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        // TODO: implement
        return new PagedActionResult([], 0, page, pageSize, false);
    }

    [HttpGet("{actionId}")]
    public async Task<ActionResult<ActionDetailDto>> GetAction(Guid actionId)
    {
        // TODO: implement
        var items = new[]
        {
            new ActionItemDto(ActionItemType.FolderCreated, null,
                Guid.NewGuid(), null, "Invoices", null),
            new ActionItemDto(ActionItemType.FileMoved, Guid.NewGuid(),
                null, "report.pdf", null, "Invoices")
        };

        return new ActionDetailDto(actionId, "Filed 1 document into Invoices and created Invoices folder.", items);
    }

    [HttpPost("{actionId}/rollback")]
    public async Task<ActionResult<RollbackResultDto>> RollbackAction(Guid actionId)
    {
        // TODO: implement
        var items = new[]
        {
            new RollbackItemDto(RollbackItemType.FileMovedBack, "Moved 'report.pdf' back to Inbox"),
            new RollbackItemDto(RollbackItemType.FolderDeleted, "Deleted folder 'Invoices'")
        };

        return new RollbackResultDto(actionId, items, true);
    }

    [HttpPost("rollback-last")]
    public async Task<ActionResult<RollbackResultDto>> RollbackLastAction()
    {
        // TODO: implement
        return new RollbackResultDto(MockActionId, [], true);
    }
}
