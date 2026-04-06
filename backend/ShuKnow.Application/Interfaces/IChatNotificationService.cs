using ShuKnow.Application.Models.Notifications;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IChatNotificationService
{
    Task SendProcessingStartedAsync(UserAction action, CancellationToken ct = default);

    Task SendMessageChunkAsync(ChatMessage message, string chunk, CancellationToken ct = default);

    Task SendMessageCompletedAsync(ChatMessage message, CancellationToken ct = default);

    Task SendClassificationResultAsync(Guid operationId, IReadOnlyCollection<ClassificationDecisionNotification> decisions, CancellationToken ct = default);

    Task SendFileCreatedAsync(FileNotification file, CancellationToken ct = default);

    Task SendFileMovedAsync(ActionItemFileMoved movedFile, CancellationToken ct = default);

    Task SendFolderCreatedAsync(FolderNotification folder, CancellationToken ct = default);

    Task SendProcessingCompletedAsync(UserAction action, int filesCreated, int filesMoved, CancellationToken ct = default);

    Task SendProcessingFailedAsync(UserAction action, string error, CancellationToken ct = default);

    Task SendProcessingCancelledAsync(ChatMessage cancellationRecord, CancellationToken ct = default);
}