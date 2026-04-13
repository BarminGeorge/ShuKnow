using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Repositories;

public interface IAttachmentRepository
{
    Task<Result<IReadOnlyList<ChatAttachment>>> GetByIdsAsync(IReadOnlyCollection<Guid> ids, Guid userId);

    Task<Result> AddRangeAsync(IReadOnlyCollection<ChatAttachment> attachments);

    Task<Result> MarkConsumedAsync(IReadOnlyCollection<Guid> ids);

    Task<Result> MarkConsumedAsync(Guid id);

    Task<Result<IReadOnlyList<ChatAttachment>>> GetExpiredUnconsumedAsync(DateTimeOffset olderThan);

    Task<Result> DeleteRangeAsync(IReadOnlyCollection<Guid> ids);

    Task<Result<IReadOnlySet<Guid>>> GetExistingBlobIdsAsync(
        IReadOnlyCollection<Guid> blobIds,
        CancellationToken ct = default);
}
