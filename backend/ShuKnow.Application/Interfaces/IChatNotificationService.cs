using ShuKnow.Domain.Entities;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Interfaces;

public interface IChatNotificationService
{
    Task SendProcessingStartedAsync(
        string connectionId,
        UserAction action,
        CancellationToken ct = default);
    
    Task SendMessageChunkAsync(
        string connectionId,
        ChatMessage message,
        string chunk,
        CancellationToken ct = default);
    
    Task SendMessageCompletedAsync(
        string connectionId,
        ChatMessage message,
        CancellationToken ct = default);
    
    Task SendClassificationResultAsync(
        string connectionId,
        IReadOnlyCollection<ActionItem> decisions,
        CancellationToken ct = default);
    
    Task SendFileCreatedAsync(
        string connectionId,
        File file,
        CancellationToken ct = default);
    
    Task SendFileMovedAsync(
        string connectionId,
        ActionItemFileMoved movedFile,
        CancellationToken ct = default);
    
    Task SendFolderCreatedAsync(string connectionId, Folder folder, CancellationToken ct = default);
    
    Task SendProcessingCompletedAsync(
        string connectionId,
        UserAction action,
        CancellationToken ct = default);
    
    Task SendProcessingFailedAsync(
        string connectionId,
        UserAction action,
        string error,
        CancellationToken ct = default);
    
    Task SendProcessingCancelledAsync(
        string connectionId,
        ChatMessage cancellationRecord,
        CancellationToken ct = default);
}
