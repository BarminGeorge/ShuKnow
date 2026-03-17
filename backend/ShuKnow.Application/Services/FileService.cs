using Ardalis.Result;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Repositories;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Services;

internal class FileService(
    IFileRepository fileRepository,
    IFolderRepository folderRepository,
    IBlobStorageService blobStorageService,
    ICurrentUserService currentUserService,
    IUnitOfWork unitOfWork)
    : IFileService
{
    private Guid CurrentUserId => currentUserService.UserId;

    public async Task<Result<File>> GetByIdAsync(Guid fileId, CancellationToken ct = default)
    {
        return await fileRepository.GetByIdAsync(fileId, CurrentUserId);
    }

    public async Task<Result<(IReadOnlyList<File> Files, int TotalCount)>> ListByFolderAsync(
        Guid folderId, int page, int pageSize, CancellationToken ct = default)
    {
        return await fileRepository.ListByFolderAsync(folderId, CurrentUserId, page, pageSize);
    }

    public async Task<Result<File>> UploadAsync(
        File file, Stream content, CancellationToken ct = default)
    {
        return await ValidateMetadata(file)
            .BindAsync(_ => fileRepository.AddAsync(file))
            .BindAsync(_ => blobStorageService.SaveAsync(content, file, ct))
            .SaveChangesAsync(unitOfWork)
            .MapAsync(() => file);
    }

    public async Task<Result<File>> UpdateMetadataAsync(File file, CancellationToken ct = default)
    {
        return await ValidateMetadata(file)
            .BindAsync(_ => fileRepository.UpdateAsync(file))
            .SaveChangesAsync(unitOfWork)
            .MapAsync(() => file);
    }

    public async Task<Result> DeleteAsync(Guid fileId, CancellationToken ct = default)
    {
        return await fileRepository.DeleteAsync(fileId)
            .SaveChangesAsync(unitOfWork);
    }

    public async Task<Result<(Stream Content, string ContentType, long SizeBytes)>> GetContentAsync(
        Guid fileId, long? rangeStart = null, long? rangeEnd = null, CancellationToken ct = default)
    {
        return await fileRepository.GetByIdAsync(fileId, CurrentUserId)
            .BindAsync(file =>
            {
                return GetStreamAsync(file, rangeStart, rangeEnd, ct)
                    .MapAsync(stream => (stream, file.ContentType, file.SizeBytes));
            });
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

    public async Task<Result> DeleteByFolderAsync(Guid folderId, CancellationToken ct = default)
    {
        return await fileRepository.DeleteByFolderAsync(folderId)
            .SaveChangesAsync(unitOfWork);
    }

    private async Task<Result> ValidateMetadata(File file)
    {
        return await fileRepository.ExistsByNameInFolderAsync(file.Name, file.FolderId, CurrentUserId, file.Id)
            .BindAsync(exists => exists ? Result.Conflict() : Result.Success());
    }

    private async Task<Result<Stream>> GetStreamAsync(
        File file, long? rangeStart = null, long? rangeEnd = null, CancellationToken ct = default)
    {
        if (rangeStart is null && rangeEnd is null)
            return await blobStorageService.GetAsync(file.Id, ct);

        var start = rangeStart ?? 0;
        var end = rangeEnd ?? file.SizeBytes;

        return await blobStorageService.GetRangeAsync(file.Id, start, end, ct);
    }
}