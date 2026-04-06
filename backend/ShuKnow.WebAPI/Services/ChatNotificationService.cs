using Microsoft.AspNetCore.SignalR;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models.Notifications;
using ShuKnow.Domain.Entities;
using ShuKnow.WebAPI.Events;
using ShuKnow.WebAPI.Hubs;
using ShuKnow.WebAPI.Mappers;

namespace ShuKnow.WebAPI.Services;

public class ChatNotificationService(
    ICurrentConnectionService currentConnection,
    IHubContext<ChatHub> hubContext) : IChatNotificationService
{
    private IClientProxy Client => hubContext.Clients.Client(currentConnection.connectionId);

    public Task SendProcessingStartedAsync(UserAction action, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnProcessingStarted), new ProcessingStartedEvent(action.OperationId), ct);

    public Task SendMessageChunkAsync(ChatMessage message, string chunk, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnMessageChunk), new MessageChunkEvent(Guid.Empty, message.Id, chunk), ct);

    public Task SendMessageCompletedAsync(ChatMessage message, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnMessageCompleted), message.ToDto(), ct);

    public Task SendClassificationResultAsync(Guid operationId, IReadOnlyCollection<ClassificationDecisionNotification> decisions, CancellationToken ct = default)
    {
        var decisionsDto = decisions.Select(x => new ClassificationDecisionDto(
            x.FileName, 
            x.TargetFolderName, 
            x.TargetFolderId, 
            x.IsNewFolder)).ToList();

        return SendEventAsync(nameof(ChatHub.OnClassificationResult), new ClassificationResultEvent(operationId, decisionsDto), ct);
    }

    public Task SendFileCreatedAsync(FileNotification file, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnFileCreated), file.ToDto(), ct);

    public Task SendFileMovedAsync(ActionItemFileMoved movedFile, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnFileMoved), new FileMovedEvent(movedFile.FileId, movedFile.FromFolderId, movedFile.ToFolderId), ct);

    public Task SendFolderCreatedAsync(FolderNotification folder, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnFolderCreated), folder.ToDto(), ct);

    public Task SendProcessingCompletedAsync(UserAction action, int filesCreated, int filesMoved, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnProcessingCompleted), 
            new ProcessingCompletedEvent(action.OperationId, action.Id, action.Summary, filesCreated, filesMoved), ct);

    public Task SendProcessingFailedAsync(UserAction action, string error, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnProcessingFailed), 
            new ProcessingFailedEvent(action.OperationId, error, ProcessingErrorCode.InternalError), ct);

    public Task SendProcessingCancelledAsync(ChatMessage cancellationRecord, CancellationToken ct = default)
        => SendEventAsync(nameof(ChatHub.OnProcessingCancelled), new ProcessingCancelledEvent(cancellationRecord.Id), ct);

    private Task SendEventAsync<TEvent>(string methodName, TEvent @event, CancellationToken ct)
        => Client.SendAsync(methodName, @event, cancellationToken: ct);
}
