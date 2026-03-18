using Ardalis.Result;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Repositories;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Services;

public class FileService(
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
        return await EnsureFolderExistsAsync(file.FolderId)
            .BindAsync(_ => ValidateMetadata(file.Name, file.FolderId, file.Id))
            .BindAsync(_ => fileRepository.AddAsync(file))
            .BindAsync(_ => blobStorageService.SaveAsync(content, file, ct))
            .SaveChangesAsync(unitOfWork)
            .MapAsync(() => file);
    }

    public async Task<Result<File>> UpdateMetadataAsync(File file, CancellationToken ct = default)
    {
        return await fileRepository.GetByIdForUpdateAsync(file.Id, CurrentUserId)
            .ActAsync(existingFile => ValidateMetadata(file.Name, existingFile.FolderId, existingFile.Id))
            .ActAsync(existingFile => existingFile.UpdateMetadata(file.Name, file.Description))
            .SaveChangesAsync(unitOfWork);
    }

    public async Task<Result> DeleteAsync(Guid fileId, CancellationToken ct = default)
    {
        return await fileRepository.GetByIdAsync(fileId, CurrentUserId)
            .BindAsync(file => fileRepository.DeleteAsync(file.Id)
                .BindAsync(_ => blobStorageService.DeleteAsync(file.Id, ct))
                .SaveChangesAsync(unitOfWork));
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

    public async Task<Result<File>> ReplaceContentAsync(
        Guid fileId, Stream content, string contentType, CancellationToken ct = default)
    {
        var existingFileResult = await fileRepository.GetByIdForUpdateAsync(fileId, CurrentUserId);
        if (!existingFileResult.IsSuccess)
            return existingFileResult;

        var existingFile = existingFileResult.Value;

        await using var bufferedContent = await BufferContentAsync(content, ct);

        existingFile.ReplaceContent(contentType, bufferedContent.Length);

        return await blobStorageService.ReplaceAsync(bufferedContent, existingFile, ct)
            .SaveChangesAsync(unitOfWork)
            .MapAsync(() => existingFile);
    }

    public async Task<Result<File>> MoveAsync(Guid fileId, Guid targetFolderId, CancellationToken ct = default)
    {
        return await EnsureFolderExistsAsync(targetFolderId)
            .BindAsync(_ => fileRepository.GetByIdForUpdateAsync(fileId, CurrentUserId))
            .ActAsync(existingFile => ValidateMetadata(existingFile.Name, targetFolderId, existingFile.Id))
            .ActAsync(existingFile => existingFile.MoveTo(targetFolderId))
            .SaveChangesAsync(unitOfWork);
    }

    public async Task<Result> DeleteByFolderAsync(Guid folderId, CancellationToken ct = default)
    {
        return await EnsureFolderExistsAsync(folderId)
            .BindAsync(_ => fileRepository.DeleteByFolderAsync(folderId))
            .BindAsync(files => DeleteBlobsAsync(files, ct))
            .SaveChangesAsync(unitOfWork);
    }

    private async Task<Result> ValidateMetadata(string name, Guid folderId, Guid fileId)
    {
        var existsResult = await fileRepository.ExistsByNameInFolderAsync(name, folderId, CurrentUserId, fileId);
        if (!existsResult.IsSuccess)
            return existsResult.Map();
        
        return existsResult.Value ? Result.Conflict() : Result.Success();
    }

    private async Task<Result> EnsureFolderExistsAsync(Guid folderId)
    {
        var existsResult = await folderRepository.ExistsByIdAsync(folderId, CurrentUserId);
        if (!existsResult.IsSuccess)
            return existsResult.Map();

        return existsResult.Value ? Result.Success() : Result.NotFound();
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

    private async Task<Result> DeleteBlobsAsync(IReadOnlyList<File> files, CancellationToken ct)
    {
        foreach (var file in files)
        {
            var result = await blobStorageService.DeleteAsync(file.Id, ct);
            if (!result.IsSuccess)
                return result;
        }

        return Result.Success();
    }

    private static async Task<MemoryStream> BufferContentAsync(Stream content, CancellationToken ct)
    {
        var bufferedContent = new MemoryStream();
        await content.CopyToAsync(bufferedContent, ct);
        bufferedContent.Position = 0;
        return bufferedContent;
    }
}
