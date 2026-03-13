using ShuKnow.Domain.Entities;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Interfaces;

public interface IChatNotificationService
{
    Task SendProcessingStartedAsync(
        string connectionId,
        UserAction action,
        CancellationToken cancellationToken = default);
    
    Task SendMessageChunkAsync(
        string connectionId,
        ChatMessage message,
        string chunk,
        CancellationToken cancellationToken = default);
    
    Task SendMessageCompletedAsync(
        string connectionId,
        ChatMessage message,
        CancellationToken cancellationToken = default);
    
    Task SendClassificationResultAsync(
        string connectionId,
        IReadOnlyCollection<ActionItem> decisions,
        CancellationToken cancellationToken = default);
    
    Task SendFileCreatedAsync(
        string connectionId,
        File file,
        CancellationToken cancellationToken = default);
    
    Task SendFileMovedAsync(
        string connectionId,
        ActionItemFileMoved movedFile,
        CancellationToken cancellationToken = default);
    
    Task SendFolderCreatedAsync(string connectionId, Folder folder, CancellationToken cancellationToken = default);
    
    Task SendProcessingCompletedAsync(
        string connectionId,
        UserAction action,
        CancellationToken cancellationToken = default);
    
    Task SendProcessingFailedAsync(
        string connectionId,
        UserAction action,
        string error,
        CancellationToken cancellationToken = default);
    
    Task SendProcessingCancelledAsync(
        string connectionId,
        ChatMessage cancellationRecord,
        CancellationToken cancellationToken = default);
}
