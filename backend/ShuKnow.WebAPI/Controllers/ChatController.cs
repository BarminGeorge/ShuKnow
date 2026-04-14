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
        return (await chatService.GetOrCreateActiveSessionAsync(ct))
            .Map(session => session.ToDto())
            .ToActionResult(this);
    }

    [HttpDelete("session")]
    public async Task<ActionResult> DeleteChatSession(CancellationToken ct)
    {
        return (await chatService.DeleteSessionAsync(ct)).ToActionResult(this);
    }

    [HttpGet("session/messages")]
    public async Task<ActionResult<CursorPagedChatMessageResult>> GetChatMessages(
        [FromQuery] string? cursor = null, [FromQuery] int limit = 50, CancellationToken ct = default)
    {
        return (await chatService.GetMessagesAsync(cursor, limit, ct))
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
            return (await attachmentService.UploadAsync(uploads, ct))
                .Map(attachments => attachments.ToDto())
                .ToActionResult(this);
        }
        finally
        {
            await uploads.DisposeContentsAsync();
        }
    }
}
