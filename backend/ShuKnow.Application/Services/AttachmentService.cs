using Ardalis.Result;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Application.Services;

public class AttachmentService(
    IAttachmentRepository attachmentRepository,
    IBlobStorageService blobStorageService,
    ICurrentUserService currentUserService,
    IUnitOfWork unitOfWork)
    : IAttachmentService
{
    private static readonly TimeSpan ExpirationThreshold = TimeSpan.FromHours(1);

    private Guid CurrentUserId => currentUserService.UserId;

    public async Task<Result<IReadOnlyList<ChatAttachment>>> UploadAsync(
        IReadOnlyCollection<ChatAttachment> attachments,
        IReadOnlyCollection<Stream> contents,
        CancellationToken ct = default)
    {
        if (attachments.Count != contents.Count)
            return Result<IReadOnlyList<ChatAttachment>>.Invalid(
                new ValidationError("Attachments and contents counts must match."));

        return await attachmentRepository.AddRangeAsync(attachments)
            .BindAsync(_ => SaveBlobsAsync(attachments, contents, ct))
            .SaveChangesAsync(unitOfWork)
            .MapAsync(() => (IReadOnlyList<ChatAttachment>)attachments.ToList().AsReadOnly());
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
                return await DeleteBlobsAsync(expired, ct)
                    .BindAsync(_ => attachmentRepository.DeleteRangeAsync(ids))
                    .SaveChangesAsync(unitOfWork)
                    .MapAsync(() => expired);
            });
    }

    private async Task<Result> SaveBlobsAsync(
        IReadOnlyCollection<ChatAttachment> attachments,
        IReadOnlyCollection<Stream> contents,
        CancellationToken ct)
    {
        foreach (var (attachment, content) in attachments.Zip(contents))
        {
            var result = await blobStorageService.SaveAsync(content, attachment.Id, ct);
            if (!result.IsSuccess)
                return result;
        }

        return Result.Success();
    }

    private async Task<Result> DeleteBlobsAsync(
        IReadOnlyList<ChatAttachment> attachments,
        CancellationToken ct)
    {
        foreach (var attachment in attachments)
        {
            var result = await blobStorageService.DeleteAsync(attachment.Id, ct);
            if (!result.IsSuccess)
                return result;
        }

        return Result.Success();
    }
}