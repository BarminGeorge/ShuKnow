using ChatAttachmentEntity = ShuKnow.Domain.Entities.ChatAttachment;
using FileEntity = ShuKnow.Domain.Entities.File;
using FolderEntity = ShuKnow.Domain.Entities.Folder;

namespace ShuKnow.Application.Interfaces;

public interface IChatNotificationService
{
    Task SendProcessingStartedAsync(Guid operationId, CancellationToken ct = default);

    Task SendMessageChunkAsync(Guid operationId, Guid messageId, string chunk, CancellationToken ct = default);

    Task SendFileCreatedAsync(FileEntity file, CancellationToken ct = default);

    Task SendFileMovedAsync(FileEntity file, Guid fromFolderId, CancellationToken ct = default);

    Task SendFolderCreatedAsync(FolderEntity folder, CancellationToken ct = default);

    Task SendTextAppendedAsync(FileEntity file, string text, CancellationToken ct = default);

    Task SendTextPrependedAsync(FileEntity file, string text, CancellationToken ct = default);

    Task SendAttachmentSavedAsync(ChatAttachmentEntity attachment, CancellationToken ct = default);

    Task SendProcessingCompletedAsync(
        Guid operationId,
        Guid actionId,
        string summary,
        int filesCreated,
        int filesMoved,
        CancellationToken ct = default);

    Task SendProcessingFailedAsync(
        Guid operationId,
        string error,
        string? errorCode = null,
        CancellationToken ct = default);
}
