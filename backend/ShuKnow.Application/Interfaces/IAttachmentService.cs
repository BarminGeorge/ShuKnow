using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IAttachmentService
{
    Task<Result<IReadOnlyList<ChatAttachment>>> UploadAsync(
        IReadOnlyList<(ChatAttachment Attachment, Stream Content)> uploads,
        CancellationToken ct = default);
    
    Task<Result<IReadOnlyList<ChatAttachment>>> GetByIdsAsync(
        IReadOnlyCollection<Guid> attachmentIds,
        CancellationToken ct = default);
    
    Task<Result> MarkConsumedAsync(
        IReadOnlyCollection<Guid> attachmentIds,
        CancellationToken ct = default);
    
    Task<Result<IReadOnlyList<ChatAttachment>>> PurgeExpiredAsync(CancellationToken ct = default);
}
