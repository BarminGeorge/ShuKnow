using Ardalis.Result;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class AttachmentRepository : IAttachmentRepository
{
    public Task<Result<IReadOnlyList<ChatAttachment>>> GetByIdsAsync(IReadOnlyCollection<Guid> ids, Guid userId)
    {
        throw new NotImplementedException();
    }

    public Task<Result> AddRangeAsync(IReadOnlyCollection<ChatAttachment> attachments)
    {
        throw new NotImplementedException();
    }

    public Task<Result> MarkConsumedAsync(IReadOnlyCollection<Guid> ids)
    {
        throw new NotImplementedException();
    }

    public Task<Result<IReadOnlyList<ChatAttachment>>> GetExpiredUnconsumedAsync(DateTimeOffset olderThan)
    {
        throw new NotImplementedException();
    }

    public Task<Result> DeleteRangeAsync(IReadOnlyCollection<Guid> ids)
    {
        throw new NotImplementedException();
    }

    public Task<Result<IReadOnlySet<Guid>>> GetAllBlobIdsAsync(CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}
