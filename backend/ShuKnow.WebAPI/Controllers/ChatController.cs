using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShuKnow.Application.Interfaces;
using ShuKnow.Metrics.Services;
using ShuKnow.WebAPI.Dto.Enums;
using ShuKnow.WebAPI.Dto.Chat;

namespace ShuKnow.WebAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ChatController(
    IMetricsService metricsService,
    ICurrentUserService currentUserService)
    : ControllerBase
{
    private static readonly Guid MockSessionId = Guid.Parse("a1b2c3d4-e5f6-7890-abcd-ef1234567890");

    [HttpGet("session")]
    public async Task<ActionResult<ChatSessionDto>> GetChatSession()
    {
        // TODO: implement
        return new ChatSessionDto(MockSessionId, ChatSessionStatus.Active, 0, false);
    }

    [HttpDelete("session")]
    public async Task<ActionResult> DeleteChatSession()
    {
        // TODO: implement
        return NoContent();
    }

    [HttpGet("session/messages")]
    public async Task<ActionResult<CursorPagedChatMessageResult>> GetChatMessages(
        [FromQuery] string? cursor = null, [FromQuery] int limit = 50)
    {
        // TODO: implement
        return new CursorPagedChatMessageResult([], null, false);
    }

    [HttpPost("attachments")]
    public async Task<ActionResult<IReadOnlyList<AttachmentDto>>> UploadChatAttachments(
        [FromForm] IFormFileCollection files)
    {
        // TODO: implement
        var attachments = files
            .Select(f => new AttachmentDto(Guid.NewGuid(), f.FileName, f.ContentType, f.Length))
            .ToList();

        await Task.WhenAll(attachments.Select(attachment 
            => metricsService.RecordContentSavedAsync(currentUserService.UserId, attachment.Id)));

        return Ok(attachments);
    }
}
