using Ardalis.Result;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Application.Services;

public class AttachmentService(
    IAttachmentRepository attachmentRepository,
    IBlobStorageService blobStorageService,
    IBlobDeletionQueue blobDeletionQueue,
    ICurrentUserService currentUserService,
    IUnitOfWork unitOfWork)
    : IAttachmentService
{
    private static readonly TimeSpan ExpirationThreshold = TimeSpan.FromHours(1);

    private Guid CurrentUserId => currentUserService.UserId;

    public async Task<Result<ChatAttachment>> GetByIdAsync(
        Guid attachmentId, CancellationToken ct = default)
    {
        return await attachmentRepository.GetByIdAsync(attachmentId, CurrentUserId);
    }

    public async Task<Result<IReadOnlyList<ChatAttachment>>> UploadAsync(
        IReadOnlyList<(ChatAttachment Attachment, Stream Content)> uploads,
        CancellationToken ct = default)
    {
        var attachments = uploads.Select(upload => upload.Attachment).ToList();

        foreach (var attachment in attachments)
            attachment.SetBlobId(Guid.NewGuid());

        return await SaveBlobsAsync(uploads, ct)
            .BindAsync(_ => attachmentRepository.AddRangeAsync(attachments))
            .SaveChangesAsync(unitOfWork)
            .MapAsync(() => (IReadOnlyList<ChatAttachment>)attachments.ToList());
    }

    public async Task<Result<IReadOnlyList<ChatAttachment>>> GetByIdsAsync(
        IReadOnlyCollection<Guid> attachmentIds, CancellationToken ct = default)
    {
        return await attachmentRepository.GetByIdsAsync(attachmentIds, CurrentUserId);
    }

    public async Task<Result> MarkConsumedAsync(
        IReadOnlyCollection<Guid> attachmentIds, CancellationToken ct = default)
    {
        return await attachmentRepository.MarkConsumedAsync(attachmentIds)
            .SaveChangesAsync(unitOfWork);
    }

    public async Task<Result<IReadOnlyList<ChatAttachment>>> PurgeExpiredAsync(CancellationToken ct = default)
    {
        var cutoff = DateTimeOffset.UtcNow - ExpirationThreshold;

        return await attachmentRepository.GetExpiredUnconsumedAsync(cutoff)
            .BindAsync(async expired =>
            {
                if (expired.Count == 0)
                    return Result.Success(expired);

                var ids = expired.Select(a => a.Id).ToList();

                return await attachmentRepository.DeleteRangeAsync(ids)
                    .SaveChangesAsync(unitOfWork)
                    .MapAsync(() => expired)
                    .ActAsync(list => EnqueueDeletesAsync(list.Select(a => a.BlobId)));
            });
    }

    private async Task<Result> SaveBlobsAsync(
        IReadOnlyList<(ChatAttachment Attachment, Stream Content)> uploads,
        CancellationToken ct)
    {
        foreach (var (attachment, content) in uploads)
        {
            var result = await blobStorageService.SaveAsync(content, attachment.BlobId, ct);
            if (!result.IsSuccess)
                return result;
        }

        return Result.Success();
    }

    private async Task EnqueueDeletesAsync(IEnumerable<Guid> blobIds)
    {
        foreach (var blobId in blobIds)
            await blobDeletionQueue.EnqueueDeleteAsync(blobId);
    }
}
