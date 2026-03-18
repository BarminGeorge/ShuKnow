using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Application.Services;

internal class AttachmentService(
    IAttachmentRepository attachmentRepository,
    IBlobStorageService blobStorageService,
    ICurrentUserService currentUserService)
    : IAttachmentService
{
    public Task<Result<IReadOnlyList<ChatAttachment>>> UploadAsync(
        IReadOnlyCollection<ChatAttachment> attachments,
        IReadOnlyCollection<Stream> contents,
        CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<IReadOnlyList<ChatAttachment>>> GetByIdsAsync(
        IReadOnlyCollection<Guid> attachmentIds, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result> MarkConsumedAsync(
        IReadOnlyCollection<Guid> attachmentIds, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<IReadOnlyList<ChatAttachment>>> PurgeExpiredAsync(CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}