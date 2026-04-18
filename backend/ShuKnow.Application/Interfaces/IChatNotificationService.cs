using ShuKnow.Application.Models.Notifications;
using ShuKnow.Domain.Entities;
using FileEntity = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Interfaces;

public interface IChatNotificationService
{
    Task SendProcessingStartedAsync(Guid operationId, CancellationToken ct = default);

    Task SendMessageChunkAsync(Guid operationId, Guid messageId, string chunk, CancellationToken ct = default);

    Task SendMessageCompletedAsync(Guid operationId, Guid messageId, CancellationToken ct = default);

    Task SendFileCreatedAsync(FileEntity file, CancellationToken ct = default);

    Task SendFileMovedAsync(FileEntity file, Guid? fromFolderId, CancellationToken ct = default);

    Task SendFolderCreatedAsync(Folder folder, CancellationToken ct = default);

    Task SendTextAppendedAsync(FileEntity file, string text, CancellationToken ct = default);

    Task SendTextPrependedAsync(FileEntity file, string text, CancellationToken ct = default);

    Task SendAttachmentSavedAsync(ChatAttachment attachment, string fileName, CancellationToken ct = default);

    Task SendProcessingCompletedAsync(Guid operationId, CancellationToken ct = default);

    Task SendProcessingFailedAsync(
        Guid operationId,
        string error,
        ChatProcessingErrorCode errorCode = ChatProcessingErrorCode.InternalError,
        CancellationToken ct = default);
}
