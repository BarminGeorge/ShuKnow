using Microsoft.AspNetCore.SignalR;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models.Notifications;
using ShuKnow.Domain.Entities;
using ShuKnow.Metrics.Services;
using ShuKnow.WebAPI.Events;
using ShuKnow.WebAPI.Hubs;
using ShuKnow.WebAPI.Mappers;
using FileEntity = ShuKnow.Domain.Entities.File;

namespace ShuKnow.WebAPI.Services;

public class ChatNotificationService(
    ICurrentConnectionService currentConnection,
    ICurrentUserService currentUserService,
    IMetricsService metricsService,
    IHubContext<ChatHub> hubContext) : IChatNotificationService
{
    private IClientProxy Client => hubContext.Clients.Client(currentConnection.connectionId);

    public Task SendProcessingStartedAsync(Guid operationId, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnProcessingStarted), new ProcessingStartedEvent(operationId), ct);

    public Task SendMessageChunkAsync(Guid operationId, Guid messageId, string chunk, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnMessageChunk), new MessageChunkEvent(operationId, messageId, chunk), ct);

    public async Task SendFileCreatedAsync(FileEntity file, CancellationToken ct = default)
    {
        await metricsService.RecordAiItemProcessedAsync(currentUserService.UserId, file.Id);
        await SendEventAsync(nameof(ChatHub.OnFileCreated), file.ToFileCreatedEvent(), ct);
    }

    public async Task SendFileMovedAsync(FileEntity file, Guid? fromFolderId, CancellationToken ct = default)
    {
        await metricsService.RecordAiItemProcessedAsync(currentUserService.UserId, file.Id);
        await SendEventAsync(nameof(ChatHub.OnFileMoved), file.ToFileMovedEvent(fromFolderId), ct);
    }

    public Task SendFolderCreatedAsync(Folder folder, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnFolderCreated), folder.ToFolderCreatedEvent(), ct);

    public Task SendTextAppendedAsync(FileEntity file, string text, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnTextAppended), file.ToTextAppendedEvent(text), ct);

    public Task SendTextPrependedAsync(FileEntity file, string text, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnTextPrepended), file.ToTextPrependedEvent(text), ct);

    public Task SendAttachmentSavedAsync(ChatAttachment attachment, string fileName, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnAttachmentSaved), attachment.ToAttachmentSavedEvent(fileName), ct);

    public Task SendProcessingCompletedAsync(Guid operationId, CancellationToken ct = default)
        => SendEventAsync(
            nameof(ChatHub.OnProcessingCompleted),
            new ProcessingCompletedEvent(operationId),
            ct);

    public Task SendProcessingFailedAsync(
        Guid operationId,
        string error,
        ChatProcessingErrorCode errorCode = ChatProcessingErrorCode.InternalError,
        CancellationToken ct = default)
    {
        return SendEventAsync(
            nameof(ChatHub.OnProcessingFailed),
            new ProcessingFailedEvent(operationId, error, MapProcessingErrorCode(errorCode)),
            ct);
    }

    private Task SendEventAsync<TEvent>(string methodName, TEvent @event, CancellationToken ct)
        => Client.SendAsync(methodName, @event, cancellationToken: ct);

    private static ProcessingErrorCode MapProcessingErrorCode(ChatProcessingErrorCode errorCode)
    {
        return errorCode switch
        {
            ChatProcessingErrorCode.LlmConnectionFailed => ProcessingErrorCode.LlmConnectionFailed,
            ChatProcessingErrorCode.LlmRateLimited => ProcessingErrorCode.LlmRateLimited,
            ChatProcessingErrorCode.LlmInvalidResponse => ProcessingErrorCode.LlmInvalidResponse,
            ChatProcessingErrorCode.ClassificationParseError => ProcessingErrorCode.ClassificationParseError,
            ChatProcessingErrorCode.FileOperationFailed => ProcessingErrorCode.FileOperationFailed,
            _ => ProcessingErrorCode.InternalError
        };
    }
}
