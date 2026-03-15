using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
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
        Folder folder, int page, int pageSize, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<File>> UploadAsync(Folder folder, File file, Stream content, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<File>> UpdateMetadataAsync(File file, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result> DeleteAsync(File file, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<(Stream Content, string ContentType, long SizeBytes)>> GetContentAsync(
        File file, long? rangeStart = null, long? rangeEnd = null, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<File>> ReplaceContentAsync(File file, Stream content, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<File>> MoveAsync(File file, Folder targetFolder, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result> DeleteByFolderAsync(Folder folder, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}