using Ardalis.Result;
using Ardalis.Result.AspNetCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Metrics.Services;
using ShuKnow.WebAPI.Dto.Chat;
using ShuKnow.WebAPI.Mappers;

namespace ShuKnow.WebAPI.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ChatController(
    IChatService chatService,
    IAttachmentService attachmentService,
    ICurrentUserService currentUser,
    IMetricsService metricsService)
    : ControllerBase
{
    [HttpPost("session")]
    public async Task<ActionResult<ChatSessionDto>> CreateChatSession(CancellationToken ct)
    {
        return (await chatService.CreateSessionAsync(ct)
            .BindAsync(session => chatService.GetMessageCountAsync(session.Id, ct)
                .MapAsync(session.ToDto)))
            .ToActionResult(this);
    }

    [NonAction]
    [Obsolete("Use CreateChatSession or GetChatSession with an explicit session id.")]
    public Task<ActionResult<ChatSessionDto>> GetChatSession(CancellationToken ct)
    {
        return CreateChatSession(ct);
    }

    [HttpGet("session/{sessionId:guid}")]
    public async Task<ActionResult<ChatSessionDto>> GetChatSession(Guid sessionId, CancellationToken ct)
    {
        return (await chatService.GetSessionAsync(sessionId, ct)
            .BindAsync(session => chatService.GetMessageCountAsync(session.Id, ct)
                .MapAsync(session.ToDto)))
            .ToActionResult(this);
    }

    [HttpDelete("session/{sessionId:guid}")]
    public async Task<ActionResult> DeleteChatSession(Guid sessionId, CancellationToken ct)
    {
        return (await chatService.DeleteSessionAsync(sessionId, ct)).ToActionResult(this);
    }

    [HttpGet("session/{sessionId:guid}/messages")]
    public async Task<ActionResult<CursorPagedChatMessageResult>> GetChatMessages(
        Guid sessionId, [FromQuery] string? cursor = null, [FromQuery] int limit = 50, CancellationToken ct = default)
    {
        return (await chatService.GetMessagesAsync(sessionId, cursor, limit, ct))
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
            return (await attachmentService.UploadAsync(uploads, ct)
                    .Tap(async attachments =>
                    {
                        var tasks = attachments.Select(a =>
                            metricsService.RecordContentSavedAsync(currentUser.UserId, a.Id));
                        await Task.WhenAll(tasks);
                    })
                    .Map(attachments => attachments.ToDto()))
                .ToActionResult(this);
        }
        finally
        {
            await uploads.DisposeContentsAsync();
        }
    }
}
