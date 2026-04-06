using ShuKnow.Application.Models.Notifications;

namespace ShuKnow.Application.Interfaces;

public interface IChatNotificationService
{
    Task SendProcessingStartedAsync(ProcessingStartedNotification notification, CancellationToken ct = default);

    Task SendMessageChunkAsync(Guid operationId, Guid messageId, string chunk, CancellationToken ct = default);

    Task SendMessageCompletedAsync(MessageCompletedNotification notification, CancellationToken ct = default);

    Task SendClassificationResultAsync(Guid operationId, IReadOnlyCollection<ClassificationDecisionNotification> decisions, CancellationToken ct = default);

    Task SendFileCreatedAsync(FileCreatedNotification notification, CancellationToken ct = default);

    Task SendFileMovedAsync(FileMovedNotification notification, CancellationToken ct = default);

    Task SendFolderCreatedAsync(FolderCreatedNotification notification, CancellationToken ct = default);

    Task SendProcessingCompletedAsync(ProcessingCompletedNotification notification, CancellationToken ct = default);

    Task SendProcessingFailedAsync(ProcessingFailedNotification notification, CancellationToken ct = default);

    Task SendProcessingCancelledAsync(Guid operationId, CancellationToken ct = default);
}