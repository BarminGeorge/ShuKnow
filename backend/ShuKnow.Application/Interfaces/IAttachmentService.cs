using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IAttachmentService
{
    Task<Result<IReadOnlyList<ChatAttachment>>> UploadAsync(
        IReadOnlyCollection<ChatAttachment> attachments,
        IReadOnlyCollection<Stream> contents,
        CancellationToken ct = default);
    
    Task<Result<IReadOnlyList<ChatAttachment>>> GetByIdsAsync(
        IReadOnlyCollection<Guid> attachmentIds,
        CancellationToken ct = default);
    
    Task<Result> MarkConsumedAsync(
        IReadOnlyCollection<ChatAttachment> attachments,
        CancellationToken ct = default);
    
    Task<Result<IReadOnlyList<ChatAttachment>>> PurgeExpiredAsync(CancellationToken ct = default);
}
