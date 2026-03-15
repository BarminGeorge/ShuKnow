using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.WebAPI.Services;

public class ChatNotificationService : IChatNotificationService
{
    public Task SendProcessingStartedAsync(string connectionId, UserAction action, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task SendMessageChunkAsync(
        string connectionId, ChatMessage message, string chunk, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task SendMessageCompletedAsync(string connectionId, ChatMessage message, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task SendClassificationResultAsync(
        string connectionId, IReadOnlyCollection<ActionItem> decisions, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task SendFileCreatedAsync(string connectionId, File file, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task SendFileMovedAsync(string connectionId, ActionItemFileMoved movedFile, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task SendFolderCreatedAsync(string connectionId, Folder folder, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task SendProcessingCompletedAsync(string connectionId, UserAction action, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task SendProcessingFailedAsync(
        string connectionId, UserAction action, string error, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task SendProcessingCancelledAsync(
        string connectionId, ChatMessage cancellationRecord, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}
