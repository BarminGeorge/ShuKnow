using Ardalis.Result;
using ShuKnow.Application.Models;
using ShuKnow.Domain.Entities;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Interfaces;

public interface IAttachmentFileService
{
    Task<Result<File>> SaveAttachmentToFileAsync(
        ChatAttachment attachment,
        ResolvedFilePath path,
        CancellationToken ct = default);
}
