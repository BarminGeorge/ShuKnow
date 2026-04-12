using System.Text;
using Ardalis.Result;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Interfaces;
using ShuKnow.Domain.Repositories;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Services;

public class FileService(
    IFileRepository fileRepository,
    IFolderRepository folderRepository,
    IBlobStorageService blobStorageService,
    IBlobDeletionQueue blobDeletionQueue,
    ICurrentUserService currentUserService,
    IUnitOfWork unitOfWork)
    : IFileService
{
    private Guid CurrentUserId => currentUserService.UserId;

    public async Task<Result<File>> GetByIdAsync(Guid fileId, CancellationToken ct = default)
    {
        return await fileRepository.GetByIdAsync(fileId, CurrentUserId);
    }

    public Task<Result<File>> GetByPathAsync(string filePath, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public async Task<Result<(IReadOnlyList<File> Files, int TotalCount)>> ListByFolderAsync(
        Guid? folderId, int page, int pageSize, CancellationToken ct = default)
    {
        return await fileRepository.ListByFolderAsync(folderId, CurrentUserId, page, pageSize);
    }

    public async Task<Result<File>> UploadAsync(
        File file, Stream content, CancellationToken ct = default)
    {
        file.BlobId = Guid.NewGuid();

        return await EnsureFolderExistsAsync(file.FolderId)
            .BindAsync(_ => EnsureFileNameUnique(file.Name, file.FolderId, file.Id))
            .BindAsync(_ => blobStorageService.SaveAsync(content, file.BlobId, ct))
            .BindAsync(_ => fileRepository.AddAsync(file))
            .SaveChangesAsync(unitOfWork)
            .MapAsync(() => file);
    }

    public async Task<Result<File>> UpdateMetadataAsync(File file, CancellationToken ct = default)
    {
        return await fileRepository.GetByIdForUpdateAsync(file.Id, CurrentUserId)
            .ActAsync(existingFile => EnsureFileNameUnique(file.Name, existingFile.FolderId, existingFile.Id))
            .Act(existingFile => existingFile.UpdateMetadata(file.Name, file.Description))
            .SaveChangesAsync(unitOfWork);
    }

    public async Task<Result> DeleteAsync(Guid fileId, CancellationToken ct = default)
    {
        return await fileRepository.GetByIdAsync(fileId, CurrentUserId)
            .ActAsync(file => fileRepository.DeleteAsync(file.Id, CurrentUserId))
            .SaveChangesAsync(unitOfWork)
            .ActAsync(file => blobDeletionQueue.EnqueueDeleteAsync(file.BlobId).AsTask())
            .BindAsync(_ => Result.Success());
    }

    public async Task<Result<(Stream Content, string ContentType, long SizeBytes)>> GetContentAsync(
        Guid fileId, long? rangeStart = null, long? rangeEnd = null, CancellationToken ct = default)
    {
        return await fileRepository.GetByIdAsync(fileId, CurrentUserId)
            .BindAsync(file => GetStreamAsync(file, rangeStart, rangeEnd, ct)
                .MapAsync(stream => (stream, file.ContentType, file.SizeBytes)));
    }

    public async Task<Result<File>> ReplaceContentAsync(
        Guid fileId, Stream content, string contentType, CancellationToken ct = default)
    {
        return await fileRepository.GetByIdForUpdateAsync(fileId, CurrentUserId)
            .BindAsync(async existingFile =>
            {
                var oldBlobId = existingFile.BlobId;
                var newBlobId = Guid.NewGuid();
                await using var upload = await PrepareUploadAsync(content, ct);

                var saveResult = await blobStorageService.SaveAsync(upload.Content, newBlobId, ct);
                if (!saveResult.IsSuccess)
                    return saveResult.Map(() => (File: existingFile, OldBlobId: oldBlobId));

                existingFile.ReplaceContent(contentType, upload.SizeBytes);
                existingFile.BlobId = newBlobId;
                return Result.Success((File: existingFile, OldBlobId: oldBlobId));
            })
            .SaveChangesAsync(unitOfWork)
            .ActAsync(pair => blobDeletionQueue.EnqueueDeleteAsync(pair.OldBlobId).AsTask())
            .Map(pair => pair.File);
    }

    public async Task<Result<File>> MoveAsync(Guid fileId, Guid? targetFolderId, CancellationToken ct = default)
    {
        return await EnsureFolderExistsAsync(targetFolderId)
            .BindAsync(_ => fileRepository.GetByIdForUpdateAsync(fileId, CurrentUserId))
            .ActAsync(existingFile => EnsureFileNameUnique(existingFile.Name, targetFolderId, existingFile.Id))
            .Act(existingFile => existingFile.MoveTo(targetFolderId))
            .SaveChangesAsync(unitOfWork);
    }

    public async Task<Result> DeleteByFolderAsync(Guid? folderId, CancellationToken ct = default)
    {
        return await EnsureFolderExistsAsync(folderId)
            .BindAsync(_ => fileRepository.DeleteByFolderAsync(folderId, CurrentUserId))
            .SaveChangesAsync(unitOfWork)
            .ActAsync(files => EnqueueDeletesAsync(files.Select(file => file.BlobId)))
            .BindAsync(_ => Result.Success());
    }

    public async Task<Result> ReorderAsync(Guid fileId, int position, CancellationToken ct = default)
    {
        return await fileRepository.GetByIdForUpdateAsync(fileId, CurrentUserId)
            .BindAsync(file => fileRepository.GetByFolderAsync(file.FolderId, CurrentUserId)
                .BindAsync(files => GetChildrenFoldersAsync(file.FolderId)
                    .BindAsync(folders => ApplyReorder(file, files, folders, position))))
            .SaveChangesAsync(unitOfWork);
    }

    public async Task<Result<File>> UpdateTextContentAsync(
        Guid fileId, string content, CancellationToken ct = default)
    {
        return await fileRepository.GetByIdForUpdateAsync(fileId, CurrentUserId)
            .Act(EnsureTextContentType)
            .BindAsync(async file =>
            {
                await using var stream = new MemoryStream(Encoding.UTF8.GetBytes(content));
                var oldBlobId = file.BlobId;
                var newBlobId = Guid.NewGuid();

                var saveResult = await blobStorageService.SaveAsync(stream, newBlobId, ct);
                if (!saveResult.IsSuccess)
                    return saveResult.Map(() => (File: file, OldBlobId: oldBlobId));

                file.ReplaceContent(file.ContentType, stream.Length);
                file.BlobId = newBlobId;
                return Result.Success((File: file, OldBlobId: oldBlobId));
            })
            .SaveChangesAsync(unitOfWork)
            .ActAsync(pair => blobDeletionQueue.EnqueueDeleteAsync(pair.OldBlobId).AsTask())
            .Map(pair => pair.File);
    }

    private static Result EnsureTextContentType(File file)
    {
        return file.ContentType.StartsWith("text/")
            ? Result.Success()
            : Result.Invalid(new ValidationError("File is not a text-based file."));
    }

    private async Task<Result> EnsureFileNameUnique(string name, Guid? folderId, Guid fileId)
    {
        return await fileRepository.ExistsByNameInFolderAsync(name, folderId, CurrentUserId, fileId)
            .BindAsync(exists => exists ? Result.Conflict() : Result.Success());
    }

    private async Task<Result> EnsureFolderExistsAsync(Guid? folderId)
    {
        if (folderId is null)
            return Result.Success();

        return await folderRepository.ExistsByIdAsync(folderId.Value, CurrentUserId)
            .BindAsync(exists => exists ? Result.Success() : Result.NotFound());
    }

    private async Task<Result<IReadOnlyList<Folder>>> GetChildrenFoldersAsync(Guid? folderId)
    {
        return folderId.HasValue
            ? await folderRepository.GetChildrenAsync(folderId.Value, CurrentUserId)
            : await folderRepository.GetRootFoldersAsync(CurrentUserId);
    }

    private async Task<Result<Stream>> GetStreamAsync(
        File file, long? rangeStart = null, long? rangeEnd = null, CancellationToken ct = default)
    {
        if (rangeStart is null && rangeEnd is null)
            return await blobStorageService.GetAsync(file.BlobId, ct);

        var start = rangeStart ?? 0;
        var end = rangeEnd ?? file.SizeBytes;

        return await blobStorageService.GetRangeAsync(file.BlobId, start, end, ct);
    }

    private async Task EnqueueDeletesAsync(IEnumerable<Guid> blobIds)
    {
        foreach (var blobId in blobIds)
            await blobDeletionQueue.EnqueueDeleteAsync(blobId);
    }

    private static async Task<PreparedUpload> PrepareUploadAsync(Stream content, CancellationToken ct)
    {
        if (content.CanSeek)
            return new PreparedUpload(content, content.Length - content.Position);

        var bufferedContent = new MemoryStream();
        await content.CopyToAsync(bufferedContent, ct);
        bufferedContent.Position = 0;
        return new PreparedUpload(bufferedContent, bufferedContent.Length, bufferedContent);
    }

    private static Result ApplyReorder(
        File file, IReadOnlyList<File> files, IReadOnlyList<Folder> folders, int position)
    {
        var siblings = BuildSortedSiblingList(files, folders);

        if (position < 0 || position >= siblings.Count)
            return Result.Invalid(new ValidationError("Position is out of range."));

        siblings.Remove(file);
        siblings.Insert(position, file);
        ApplySortOrder(siblings);

        return Result.Success();
    }

    private static List<IOrderedItem> BuildSortedSiblingList(IReadOnlyList<File> files, IReadOnlyList<Folder> folders)
    {
        return files.Cast<IOrderedItem>()
            .Concat(folders)
            .OrderBy(item => item.SortOrder)
            .ToList();
    }

    private static void ApplySortOrder<T>(List<T> items) where T : class, IOrderedItem
    {
        for (var i = 0; i < items.Count; i++)
            items[i].SortOrder = i;
    }

    private sealed class PreparedUpload(Stream content, long sizeBytes, IAsyncDisposable? disposable = null)
        : IAsyncDisposable
    {
        public Stream Content { get; } = content;
        public long SizeBytes { get; } = sizeBytes;

        public ValueTask DisposeAsync()
            => disposable?.DisposeAsync() ?? ValueTask.CompletedTask;
    }
}
