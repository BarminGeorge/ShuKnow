using Microsoft.AspNetCore.SignalR;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models.Notifications;
using ShuKnow.WebAPI.Events;
using ShuKnow.WebAPI.Hubs;
using ShuKnow.WebAPI.Mappers;

namespace ShuKnow.WebAPI.Services;

public class ChatNotificationService(
    ICurrentConnectionService currentConnection,
    IHubContext<ChatHub> hubContext) : IChatNotificationService
{
    private IClientProxy Client => hubContext.Clients.Client(currentConnection.connectionId);

    public Task SendProcessingStartedAsync(ProcessingStartedNotification notification, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnProcessingStarted), new ProcessingStartedEvent(notification.OperationId), ct);

    public Task SendMessageChunkAsync(Guid operationId, Guid messageId, string chunk, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnMessageChunk), new MessageChunkEvent(operationId, messageId, chunk), ct);

    public Task SendMessageCompletedAsync(MessageCompletedNotification notification, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnMessageCompleted), notification.ToDto(), ct);

    public Task SendClassificationResultAsync(Guid operationId, IReadOnlyCollection<ClassificationDecisionNotification> decisions, CancellationToken ct = default)
    {
        var decisionsDto = decisions.Select(x => x.ToDto()).ToList();
        return SendEventAsync(nameof(ChatHub.OnClassificationResult), new ClassificationResultEvent(operationId, decisionsDto), ct);
    }

    public Task SendFileCreatedAsync(FileCreatedNotification notification, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnFileCreated), notification.ToDto(), ct);

    public Task SendFileMovedAsync(FileMovedNotification notification, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnFileMoved), new FileMovedEvent(notification.FileId, notification.FromFolderId, notification.ToFolderId), ct);

    public Task SendFolderCreatedAsync(FolderCreatedNotification notification, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnFolderCreated), notification.ToDto(), ct);

    public Task SendProcessingCompletedAsync(ProcessingCompletedNotification notification, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnProcessingCompleted), 
            new ProcessingCompletedEvent(notification.OperationId, notification.ActionId, notification.Summary, notification.FilesCreated, notification.FilesMoved), ct);

    public Task SendProcessingFailedAsync(ProcessingFailedNotification notification, CancellationToken ct = default)
    {
        var errorCode = Enum.TryParse<ProcessingErrorCode>(notification.ErrorCode, true, out var parsed)
            ? parsed
            : ProcessingErrorCode.InternalError;

        return SendEventAsync(nameof(ChatHub.OnProcessingFailed), 
            new ProcessingFailedEvent(notification.OperationId, notification.Error, errorCode), ct);
    }

    public Task SendProcessingCancelledAsync(Guid operationId, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnProcessingCancelled), new ProcessingCancelledEvent(operationId), ct);

    private Task SendEventAsync<TEvent>(string methodName, TEvent @event, CancellationToken ct)
        => Client.SendAsync(methodName, @event, cancellationToken: ct);
}
