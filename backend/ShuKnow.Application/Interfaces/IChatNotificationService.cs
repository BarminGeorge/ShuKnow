using ShuKnow.Domain.Entities;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Interfaces;

public interface IChatNotificationService
{
    Task SendProcessingStartedAsync(UserAction action, CancellationToken ct = default);

    Task SendMessageChunkAsync(ChatMessage message, string chunk, CancellationToken ct = default);

    Task SendMessageCompletedAsync(ChatMessage message, CancellationToken ct = default);

    Task SendClassificationResultAsync(IReadOnlyCollection<ActionItem> decisions, CancellationToken ct = default);

    Task SendFileCreatedAsync(File file, CancellationToken ct = default);

    Task SendFileMovedAsync(ActionItemFileMoved movedFile, CancellationToken ct = default);

    Task SendFolderCreatedAsync(Folder folder, CancellationToken ct = default);

    Task SendProcessingCompletedAsync(UserAction action, CancellationToken ct = default);

    Task SendProcessingFailedAsync(UserAction action, string error, CancellationToken ct = default);

    Task SendProcessingCancelledAsync(ChatMessage cancellationRecord, CancellationToken ct = default);
}