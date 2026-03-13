using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IAttachmentService
{
    Task<Result<IReadOnlyList<ChatAttachment>>> UploadAsync(
        IReadOnlyCollection<ChatAttachment> attachments,
        IReadOnlyCollection<Stream> contents,
        CancellationToken cancellationToken = default);
    
    Task<Result<IReadOnlyList<ChatAttachment>>> GetByIdsAsync(
        IReadOnlyCollection<Guid> attachmentIds,
        CancellationToken cancellationToken = default);
    
    Task<Result> MarkConsumedAsync(
        IReadOnlyCollection<ChatAttachment> attachments,
        CancellationToken cancellationToken = default);
    
    Task<Result<IReadOnlyList<ChatAttachment>>> PurgeExpiredAsync(CancellationToken cancellationToken = default);
}
