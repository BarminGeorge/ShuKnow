using Ardalis.Result;
using Ardalis.Result.AspNetCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShuKnow.Application.Interfaces;
using ShuKnow.WebAPI.Dto.Chat;
using ShuKnow.WebAPI.Mappers;

namespace ShuKnow.WebAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ChatController(
    IChatService chatService,
    IAttachmentService attachmentService,
    ICurrentUserService currentUser)
    : ControllerBase
{
    [HttpGet("session")]
    public async Task<ActionResult<ChatSessionDto>> GetChatSession(CancellationToken ct)
    {
        var result = await chatService.GetOrCreateActiveSessionAsync(ct);
        return result
            .Map(session => session.ToDto())
            .ToActionResult(this);
    }

    [HttpDelete("session")]
    public async Task<ActionResult> DeleteChatSession(CancellationToken ct)
    {
        var result = await chatService.DeleteSessionAsync(ct);
        return result.ToActionResult(this);
    }

    [HttpGet("session/messages")]
    public async Task<ActionResult<CursorPagedChatMessageResult>> GetChatMessages(
        [FromQuery] string? cursor = null, [FromQuery] int limit = 50, CancellationToken ct = default)
    {
        var result = await chatService.GetMessagesAsync(cursor, limit, ct);
        return result
            .Map(page => page.ToDto())
            .ToActionResult(this);
    }

    [HttpPost("attachments")]
    public async Task<ActionResult<IReadOnlyList<AttachmentDto>>> UploadChatAttachments(
        [FromForm] IFormFileCollection files,
        CancellationToken ct)
    {
        var uploads = files.ToUploads(currentUser.UserId);

        try
        {
            var result = await attachmentService.UploadAsync(uploads, ct);
            return result
                .Map(attachments => attachments.ToDto())
                .ToActionResult(this);
        }
        finally
        {
            foreach (var upload in uploads)
                await upload.Content.DisposeAsync();
        }
    }
}
