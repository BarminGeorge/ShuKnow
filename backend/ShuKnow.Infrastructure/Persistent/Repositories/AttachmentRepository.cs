using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class AttachmentRepository(AppDbContext context) : IAttachmentRepository
{
    public async Task<Result<IReadOnlyList<ChatAttachment>>> GetByIdsAsync(IReadOnlyCollection<Guid> ids, Guid userId)
    {
        var attachments = await context.ChatAttachments
            .Where(a => ids.Contains(a.Id) && userId == a.UserId)
            .ToListAsync();
        
        return Result<IReadOnlyList<ChatAttachment>>.Success(attachments);
    }

    public async Task<Result> AddRangeAsync(IReadOnlyCollection<ChatAttachment> attachments)
    {
        await context.ChatAttachments.AddRangeAsync(attachments);
        return Result.Success();
    }

    public async Task<Result> MarkConsumedAsync(IReadOnlyCollection<Guid> ids)
    {
        var attachments = await context.ChatAttachments
            .Where(a => ids.Contains(a.Id))
            .ToListAsync();

        foreach (var attachment in attachments)
            attachment.IsConsumed = true;
        
        return Result.Success();
    }

    public async Task<Result<IReadOnlyList<ChatAttachment>>> GetExpiredUnconsumedAsync(DateTimeOffset olderThan)
    {
        var expiredAttachments = await context.ChatAttachments
            .Where(x => x.CreatedAt < olderThan && !x.IsConsumed)
            .ToListAsync();
        
        return Result<IReadOnlyList<ChatAttachment>>.Success(expiredAttachments);
    }

    public async Task<Result> DeleteRangeAsync(IReadOnlyCollection<Guid> ids)
    {
        await context.ChatAttachments
            .Where(x => ids.Contains(x.Id))
            .ExecuteDeleteAsync();
        
        return Result.Success();
    }

    public async Task<Result<IReadOnlySet<Guid>>> GetExistingBlobIdsAsync(
        IReadOnlyCollection<Guid> blobIds,
        CancellationToken ct = default)
    {
        var existingBlobIds = await context.ChatAttachments
            .Where(a => blobIds.Contains(a.BlobId))
            .Select(a => a.BlobId)
            .ToListAsync(ct);
            
        return Result<IReadOnlySet<Guid>>.Success(existingBlobIds.ToHashSet());
    }
}
