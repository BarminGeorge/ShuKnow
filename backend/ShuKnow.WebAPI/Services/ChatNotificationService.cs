using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.WebAPI.Services;

public class ChatNotificationService(ICurrentConnectionService currentConnection) : IChatNotificationService
{
    public Task SendProcessingStartedAsync(UserAction action, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task SendMessageChunkAsync(ChatMessage message, string chunk, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task SendMessageCompletedAsync(ChatMessage message, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task SendClassificationResultAsync(IReadOnlyCollection<ActionItem> decisions, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task SendFileCreatedAsync(File file, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task SendFileMovedAsync(ActionItemFileMoved movedFile, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task SendFolderCreatedAsync(Folder folder, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task SendProcessingCompletedAsync(UserAction action, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task SendProcessingFailedAsync(UserAction action, string error, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task SendProcessingCancelledAsync(ChatMessage cancellationRecord, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}
