using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;
using ShuKnow.Domain.Entities;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Services;

public class AttachmentFileService(
    IFileService fileService,
    IBlobStorageService blobStorageService,
    ICurrentUserService currentUserService)
    : IAttachmentFileService
{
    private Guid CurrentUserId => currentUserService.UserId;

    public async Task<Result<File>> SaveAttachmentToFileAsync(
        ChatAttachment attachment,
        ResolvedFilePath path,
        CancellationToken ct = default)
    {
        var contentResult = await blobStorageService.GetAsync(attachment.BlobId, ct);
        if (!contentResult.IsSuccess)
            return contentResult.Map();

        await using var content = contentResult.Value;
        var file = BuildAttachmentFile(attachment, path);

        return await fileService.UploadAsync(file, content, ct);
    }

    private File BuildAttachmentFile(ChatAttachment attachment, ResolvedFilePath path)
    {
        return new File(
            Guid.NewGuid(),
            CurrentUserId,
            path.FolderId,
            path.FileName,
            string.Empty,
            attachment.ContentType,
            attachment.SizeBytes);
    }
}
