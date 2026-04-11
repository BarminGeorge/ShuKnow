using Microsoft.AspNetCore.SignalR;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using FileEntity = ShuKnow.Domain.Entities.File;
using ShuKnow.WebAPI.Events;
using ShuKnow.WebAPI.Hubs;
using ShuKnow.WebAPI.Mappers;

namespace ShuKnow.WebAPI.Services;

public class ChatNotificationService(
    ICurrentConnectionService currentConnection,
    IHubContext<ChatHub> hubContext) : IChatNotificationService
{
    private IClientProxy Client => hubContext.Clients.Client(currentConnection.connectionId);

    public Task SendProcessingStartedAsync(Guid operationId, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnProcessingStarted), new ProcessingStartedEvent(operationId), ct);

    public Task SendMessageChunkAsync(Guid operationId, Guid messageId, string chunk, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnMessageChunk), new MessageChunkEvent(operationId, messageId, chunk), ct);

    public Task SendFileCreatedAsync(FileEntity file, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnFileCreated), file.ToFileCreatedEvent(), ct);

    public Task SendFileMovedAsync(FileEntity file, Guid fromFolderId, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnFileMoved), file.ToFileMovedEvent(fromFolderId), ct);

    public Task SendFolderCreatedAsync(Folder folder, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnFolderCreated), folder.ToFolderCreatedEvent(), ct);

    public Task SendTextAppendedAsync(FileEntity file, string text, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnTextAppended), file.ToTextAppendedEvent(text), ct);

    public Task SendTextPrependedAsync(FileEntity file, string text, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnTextPrepended), file.ToTextPrependedEvent(text), ct);

    public Task SendAttachmentSavedAsync(ChatAttachment attachment, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnAttachmentSaved), attachment.ToAttachmentSavedEvent(), ct);

    public Task SendProcessingCompletedAsync(
        Guid operationId,
        Guid actionId,
        string summary,
        int filesCreated,
        int filesMoved,
        CancellationToken ct = default)
        => SendEventAsync(
            nameof(ChatHub.OnProcessingCompleted),
            new ProcessingCompletedEvent(operationId, actionId, summary, filesCreated, filesMoved),
            ct);

    public Task SendProcessingFailedAsync(
        Guid operationId,
        string error,
        string? errorCode = null,
        CancellationToken ct = default)
    {
        var parsedErrorCode = Enum.TryParse<ProcessingErrorCode>(errorCode, true, out var parsed)
            ? parsed
            : ProcessingErrorCode.InternalError;

        return SendEventAsync(
            nameof(ChatHub.OnProcessingFailed),
            new ProcessingFailedEvent(operationId, error, parsedErrorCode),
            ct);
    }

    private Task SendEventAsync<TEvent>(string methodName, TEvent @event, CancellationToken ct)
        => Client.SendAsync(methodName, @event, cancellationToken: ct);
}
