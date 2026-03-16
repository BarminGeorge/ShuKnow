using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Repositories;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Services;

internal class FileService(
    IFileRepository fileRepository,
    IFolderRepository folderRepository,
    IBlobStorageService blobStorageService,
    ICurrentUserService currentUserService)
    : IFileService
{
    public Task<Result<File>> GetByIdAsync(Guid fileId, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<(IReadOnlyList<File> Files, int TotalCount)>> ListByFolderAsync(
        Guid folderId, int page, int pageSize, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<File>> UploadAsync(Guid folderId, File file, Stream content, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<File>> UpdateMetadataAsync(Guid fileId, File file, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result> DeleteAsync(Guid fileId, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<(Stream Content, string ContentType, long SizeBytes)>> GetContentAsync(
        Guid fileId, long? rangeStart = null, long? rangeEnd = null, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<File>> ReplaceContentAsync(
        Guid fileId, Stream content, string contentType, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<File>> MoveAsync(Guid fileId, Guid targetFolderId, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result> DeleteByFolderAsync(Guid folderId, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}