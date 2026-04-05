using Ardalis.Result;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Application.Services;

internal class FolderService(
    IFolderRepository folderRepository,
    IFileRepository fileRepository,
    ICurrentUserService currentUserService,
    IUnitOfWork unitOfWork) 
    : IFolderService
{
    private Guid CurrentUserId => currentUserService.UserId;

    public async Task<Result<IReadOnlyList<Folder>>> GetTreeAsync(CancellationToken ct = default)
    {
        return await folderRepository.GetTreeAsync(CurrentUserId);
    }

    public async Task<Result<IReadOnlyList<FolderSummary>>> GetFolderTreeForPromptAsync(CancellationToken ct = default)
    {
        var treeResult = await GetTreeAsync(ct);
        if (!treeResult.IsSuccess)
            return ToTypedResult<IReadOnlyList<Folder>, IReadOnlyList<FolderSummary>>(treeResult);

        IReadOnlyList<FolderSummary> summaries = treeResult.Value
            .Select(folder => new FolderSummary(folder.Id, folder.Name, folder.Description, folder.ParentFolderId))
            .ToList();

        return Result.Success(summaries);
    }

    public async Task<Result<IReadOnlyList<Folder>>> ListAsync(Guid? parentFolderId = null, CancellationToken ct = default)
    {
        return await ListInternalAsync(parentFolderId);
    }

    public async Task<Result<Folder>> GetByIdAsync(Guid folderId, CancellationToken ct = default)
    {
        return await folderRepository.GetByIdAsync(folderId, CurrentUserId);
    }

    public async Task<Result<IReadOnlyList<Folder>>> GetChildrenAsync(Guid folderId, CancellationToken ct = default)
    {
        return await EnsureFolderExistsAsync(folderId)
            .BindAsync(_ => folderRepository.GetChildrenAsync(folderId, CurrentUserId));
    }

    public async Task<Result<Folder>> CreateAsync(Folder folder, CancellationToken ct = default)
    {
        return await EnsureParentFolderExistsAsync(folder.ParentFolderId)
            .BindAsync(_ => EnsureFolderNameUniqueAsync(folder.Name, folder.ParentFolderId))
            .BindAsync(_ => folderRepository.GetSiblingsAsync(folder.ParentFolderId, CurrentUserId))
            .BindAsync(siblings =>
            {
                var folderToCreate = new Folder(
                    folder.Id,
                    CurrentUserId,
                    folder.Name,
                    folder.Description,
                    folder.ParentFolderId,
                    siblings.Count);

                return folderRepository.AddAsync(folderToCreate)
                    .SaveChangesAsync(unitOfWork)
                    .MapAsync(() => folderToCreate);
            });
    }

    public async Task<Result<Folder>> UpdateAsync(Folder folder, CancellationToken ct = default)
    {
        return await folderRepository.GetByIdAsync(folder.Id, CurrentUserId)
            .ActAsync(existingFolder => EnsureFolderNameUniqueAsync(folder.Name, existingFolder.ParentFolderId, existingFolder.Id))
            .BindAsync(existingFolder =>
            {
                var updatedFolder = CopyFolder(
                    existingFolder,
                    name: folder.Name,
                    description: folder.Description);

                return folderRepository.UpdateAsync(updatedFolder)
                    .SaveChangesAsync(unitOfWork)
                    .MapAsync(() => updatedFolder);
            });
    }

    public async Task<Result> DeleteAsync(Guid folderId, bool recursive, CancellationToken ct = default)
    {
        return await folderRepository.GetByIdAsync(folderId, CurrentUserId)
            .BindAsync(_ => recursive
                ? folderRepository.DeleteSubtreeAsync(folderId, CurrentUserId)
                    .SaveChangesAsync(unitOfWork)
                : DeleteNonRecursiveAsync(folderId));
    }

    public async Task<Result<Folder>> MoveAsync(Guid folderId, Guid? newParentFolderId = null, CancellationToken ct = default)
    {
        var existingFolderResult = await folderRepository.GetByIdAsync(folderId, CurrentUserId);
        if (!existingFolderResult.IsSuccess)
            return existingFolderResult;

        var existingFolder = existingFolderResult.Value;
        if (existingFolder.ParentFolderId == newParentFolderId)
            return existingFolderResult;

        var validationResult = await EnsureMoveIsValidAsync(existingFolder.Id, existingFolder.Name, newParentFolderId);
        if (!validationResult.IsSuccess)
            return ToTypedResult<Folder>(validationResult);

        var siblingsResult = await folderRepository.GetSiblingsAsync(newParentFolderId, CurrentUserId);
        if (!siblingsResult.IsSuccess)
            return ToTypedResult<IReadOnlyList<Folder>, Folder>(siblingsResult);

        var movedFolder = CopyFolder(
            existingFolder,
            newParentFolderId: newParentFolderId,
            updateParentFolderId: true,
            sortOrder: siblingsResult.Value.Count);

        return await folderRepository.UpdateAsync(movedFolder)
            .SaveChangesAsync(unitOfWork)
            .MapAsync(() => movedFolder);
    }

    public async Task<Result> ReorderAsync(Guid folderId, int position, CancellationToken ct = default)
    {
        if (position < 0)
            return Result.Error("Position must be greater than or equal to zero.");

        var existingFolderResult = await folderRepository.GetByIdAsync(folderId, CurrentUserId);
        if (!existingFolderResult.IsSuccess)
            return existingFolderResult.Map();

        var siblingsResult = await folderRepository.GetSiblingsAsync(existingFolderResult.Value.ParentFolderId, CurrentUserId);
        if (!siblingsResult.IsSuccess)
            return siblingsResult.Map();

        var reorderedFolders = siblingsResult.Value.ToList();
        var currentIndex = reorderedFolders.FindIndex(folder => folder.Id == folderId);
        if (currentIndex < 0)
            return Result.NotFound();

        var targetIndex = Math.Min(position, reorderedFolders.Count - 1);
        if (currentIndex == targetIndex)
            return Result.Success();

        var movedFolder = reorderedFolders[currentIndex];
        reorderedFolders.RemoveAt(currentIndex);
        reorderedFolders.Insert(targetIndex, movedFolder);

        foreach (var indexedFolder in reorderedFolders.Select((folder, index) => new { folder, index }))
        {
            if (indexedFolder.folder.SortOrder == indexedFolder.index)
                continue;

            var updatedFolder = CopyFolder(indexedFolder.folder, sortOrder: indexedFolder.index);
            var updateResult = await folderRepository.UpdateAsync(updatedFolder);
            if (!updateResult.IsSuccess)
                return updateResult;
        }

        return await unitOfWork.SaveChangesAsync();
    }

    public async Task<Result<Folder>> EnsureInboxExistsAsync(CancellationToken ct = default)
    {
        var rootFoldersResult = await folderRepository.GetRootFoldersAsync(CurrentUserId);
        if (!rootFoldersResult.IsSuccess)
            return ToTypedResult<IReadOnlyList<Folder>, Folder>(rootFoldersResult);

        var existingInbox = rootFoldersResult.Value.FirstOrDefault(folder => folder.Name == "Inbox");
        if (existingInbox is not null)
            return existingInbox;

        var inbox = new Folder(
            Guid.NewGuid(),
            CurrentUserId,
            "Inbox",
            string.Empty,
            sortOrder: rootFoldersResult.Value.Count);

        return await folderRepository.AddAsync(inbox)
            .SaveChangesAsync(unitOfWork)
            .MapAsync(() => inbox);
    }

    private async Task<Result<IReadOnlyList<Folder>>> ListInternalAsync(Guid? parentFolderId)
    {
        if (!parentFolderId.HasValue)
            return await folderRepository.GetRootFoldersAsync(CurrentUserId);

        return await EnsureFolderExistsAsync(parentFolderId.Value)
            .BindAsync(_ => folderRepository.GetChildrenAsync(parentFolderId.Value, CurrentUserId));
    }

    private async Task<Result> DeleteNonRecursiveAsync(Guid folderId)
    {
        var childrenResult = await folderRepository.GetChildrenAsync(folderId, CurrentUserId);
        if (!childrenResult.IsSuccess)
            return childrenResult.Map();

        if (childrenResult.Value.Count > 0)
            return Result.Conflict("Cannot delete a folder that has child folders without recursive deletion.");

        var fileCountResult = await fileRepository.CountByFolderAsync(folderId);
        if (!fileCountResult.IsSuccess)
            return fileCountResult.Map();

        if (fileCountResult.Value > 0)
            return Result.Conflict("Cannot delete a folder that contains files without recursive deletion.");

        return await folderRepository.DeleteAsync(folderId, CurrentUserId)
            .SaveChangesAsync(unitOfWork);
    }

    private async Task<Result> EnsureFolderExistsAsync(Guid folderId)
    {
        var existsResult = await folderRepository.ExistsByIdAsync(folderId, CurrentUserId);
        if (!existsResult.IsSuccess)
            return existsResult.Map();

        return existsResult.Value ? Result.Success() : Result.NotFound();
    }

    private Task<Result> EnsureParentFolderExistsAsync(Guid? parentFolderId)
    {
        return parentFolderId.HasValue
            ? EnsureFolderExistsAsync(parentFolderId.Value)
            : Task.FromResult(Result.Success());
    }

    private async Task<Result> EnsureFolderNameUniqueAsync(string name, Guid? parentFolderId, Guid? excludeId = null)
    {
        var existsResult = await folderRepository.ExistsByNameInParentAsync(name, parentFolderId, CurrentUserId, excludeId);
        if (!existsResult.IsSuccess)
            return existsResult.Map();

        return existsResult.Value ? Result.Conflict() : Result.Success();
    }

    private async Task<Result> EnsureMoveIsValidAsync(Guid folderId, string folderName, Guid? newParentFolderId)
    {
        if (newParentFolderId == folderId)
            return Result.Conflict("A folder cannot be moved into itself.");

        var parentExistsResult = await EnsureParentFolderExistsAsync(newParentFolderId);
        if (!parentExistsResult.IsSuccess)
            return parentExistsResult;

        var uniqueNameResult = await EnsureFolderNameUniqueAsync(folderName, newParentFolderId, folderId);
        if (!uniqueNameResult.IsSuccess)
            return uniqueNameResult;

        if (!newParentFolderId.HasValue)
            return Result.Success();

        var ancestorIdsResult = await folderRepository.GetAncestorIdsAsync(newParentFolderId.Value, CurrentUserId);
        if (!ancestorIdsResult.IsSuccess)
            return ancestorIdsResult.Map();

        return ancestorIdsResult.Value.Contains(folderId)
            ? Result.Conflict("A folder cannot be moved into its own subtree.")
            : Result.Success();
    }

    private static Folder CopyFolder(
        Folder source,
        string? name = null,
        string? description = null,
        Guid? newParentFolderId = null,
        bool updateParentFolderId = false,
        int? sortOrder = null)
    {
        return new Folder(
            source.Id,
            source.UserId,
            name ?? source.Name,
            description ?? source.Description,
            updateParentFolderId ? newParentFolderId : source.ParentFolderId,
            sortOrder ?? source.SortOrder);
    }

    private static Result<T> ToTypedResult<T>(Result result)
    {
        return result.Status switch
        {
            ResultStatus.Unauthorized => Result<T>.Unauthorized(),
            ResultStatus.NotFound => Result<T>.NotFound(),
            ResultStatus.Conflict => Result<T>.Conflict(),
            _ => Result<T>.Error()
        };
    }

    private static Result<TDestination> ToTypedResult<TSource, TDestination>(Result<TSource> result)
    {
        return result.Status switch
        {
            ResultStatus.Unauthorized => Result<TDestination>.Unauthorized(),
            ResultStatus.NotFound => Result<TDestination>.NotFound(),
            ResultStatus.Conflict => Result<TDestination>.Conflict(),
            _ => Result<TDestination>.Error()
        };
    }
}
