using Ardalis.Result;
using Ardalis.Result.AspNetCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
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
            .Map(page => new CursorPagedChatMessageResult(
                page.Messages.Select(message => message.ToDto()).ToList(),
                page.NextCursor,
                page.NextCursor is not null))
            .ToActionResult(this);
    }

    [HttpPost("attachments")]
    public async Task<ActionResult<IReadOnlyList<AttachmentDto>>> UploadChatAttachments(
        [FromForm] IFormFileCollection files,
        CancellationToken ct)
    {
        var uploads = files
            .Select(file => (
                Attachment: new ChatAttachment(
                    Guid.NewGuid(),
                    currentUser.UserId,
                    Guid.Empty,
                    file.FileName,
                    file.ContentType,
                    file.Length),
                Content: file.OpenReadStream()))
            .ToList();

        try
        {
            var result = await attachmentService.UploadAsync(uploads, ct);
            return result
                .Map(attachments => (IReadOnlyList<AttachmentDto>)attachments
                    .Select(attachment => attachment.ToDto())
                    .ToList())
                .ToActionResult(this);
        }
        finally
        {
            foreach (var upload in uploads)
                await upload.Content.DisposeAsync();
        }
    }
}
