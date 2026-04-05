using Ardalis.Result;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Application.Services;

internal class FolderService(
    IFolderRepository folderRepository,
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
            return treeResult.ToTypedResult<IReadOnlyList<Folder>, IReadOnlyList<FolderSummary>>();

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
        return await GetByIdAsync(folder.Id, ct)
            .ActAsync(existingFolder => EnsureFolderNameUniqueAsync(folder.Name, existingFolder.ParentFolderId, existingFolder.Id))
            .BindAsync(existingFolder =>
            {
                var updatedFolder = UpdateFolder(
                    existingFolder,
                    name: folder.Name,
                    description: folder.Description);

                return folderRepository.UpdateAsync(updatedFolder)
                    .SaveChangesAsync(unitOfWork)
                    .MapAsync(() => updatedFolder);
            });
    }

    public async Task<Result> DeleteAsync(Guid folderId, CancellationToken ct = default)
    {
        return await GetByIdAsync(folderId, ct)
            .BindAsync(_ => folderRepository.DeleteSubtreeAsync(folderId, CurrentUserId))
            .SaveChangesAsync(unitOfWork);
    }

    public async Task<Result<Folder>> MoveAsync(Guid folderId, Guid? newParentFolderId = null, CancellationToken ct = default)
    {
        return await GetByIdAsync(folderId, ct)
            .BindAsync(existingFolder =>
            {
                if (existingFolder.ParentFolderId == newParentFolderId)
                    return Task.FromResult(Result.Success(existingFolder));

                return EnsureMoveIsValidAsync(existingFolder.Id, existingFolder.Name, newParentFolderId)
                    .BindAsync(_ => folderRepository.GetSiblingsAsync(newParentFolderId, CurrentUserId))
                    .BindAsync(siblings =>
                    {
                        var movedFolder = UpdateFolder(
                            existingFolder,
                            newParentFolderId: newParentFolderId,
                            updateParentFolderId: true,
                            sortOrder: siblings.Count);

                        return folderRepository.UpdateAsync(movedFolder)
                            .SaveChangesAsync(unitOfWork)
                            .MapAsync(() => movedFolder);
                    });
            });
    }

    public async Task<Result> ReorderAsync(Guid folderId, int position, CancellationToken ct = default)
    {
        return await EnsurePositionValidAsync(position)
            .BindAsync(_ => GetByIdAsync(folderId, ct))
            .BindAsync(folder => folderRepository.GetSiblingsAsync(folder.ParentFolderId, CurrentUserId))
            .BindAsync(siblings => ApplyReorderAsync(siblings, folderId, position));
    }

    private async Task<Result> ApplyReorderAsync(IReadOnlyList<Folder> siblings, Guid folderId, int position)
    {
        var reorderedFolders = siblings.ToList();
        var currentIndex = reorderedFolders.FindIndex(folder => folder.Id == folderId);
        if (currentIndex < 0)
            return Result.NotFound();

        var targetIndex = Math.Min(position, reorderedFolders.Count - 1);
        if (currentIndex == targetIndex)
            return Result.Success();

        var movedFolder = reorderedFolders[currentIndex];
        reorderedFolders.RemoveAt(currentIndex);
        reorderedFolders.Insert(targetIndex, movedFolder);

        return await UpdateSortOrdersAsync(reorderedFolders);
    }

    private async Task<Result> UpdateSortOrdersAsync(List<Folder> folders)
    {
        var updatedFolders = folders
            .Select((folder, index) => (folder, index))
            .Where(x => x.folder.SortOrder != x.index)
            .Select(x => UpdateFolder(x.folder, sortOrder: x.index))
            .ToList();

        if (updatedFolders.Count == 0)
            return Result.Success();

        return await folderRepository.UpdateRangeAsync(updatedFolders)
            .SaveChangesAsync(unitOfWork);
    }

    private async Task<Result<IReadOnlyList<Folder>>> ListInternalAsync(Guid? parentFolderId)
    {
        if (!parentFolderId.HasValue)
            return await folderRepository.GetRootFoldersAsync(CurrentUserId);

        return await EnsureFolderExistsAsync(parentFolderId.Value)
            .BindAsync(_ => folderRepository.GetChildrenAsync(parentFolderId.Value, CurrentUserId));
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

    private static Task<Result> EnsurePositionValidAsync(int position)
    {
        return Task.FromResult(position >= 0
            ? Result.Success()
            : Result.Error("Position must be greater than or equal to zero."));
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
        return await EnsureNotMovingIntoSelfAsync(folderId, newParentFolderId)
            .BindAsync(_ => EnsureParentFolderExistsAsync(newParentFolderId))
            .BindAsync(_ => EnsureFolderNameUniqueAsync(folderName, newParentFolderId, folderId))
            .BindAsync(_ => EnsureNotMovingIntoSubtreeAsync(folderId, newParentFolderId));
    }

    private static Task<Result> EnsureNotMovingIntoSelfAsync(Guid folderId, Guid? newParentFolderId)
    {
        return Task.FromResult(newParentFolderId == folderId
            ? Result.Conflict("A folder cannot be moved into itself.")
            : Result.Success());
    }

    private async Task<Result> EnsureNotMovingIntoSubtreeAsync(Guid folderId, Guid? newParentFolderId)
    {
        if (!newParentFolderId.HasValue)
            return Result.Success();

        return await folderRepository.GetAncestorIdsAsync(newParentFolderId.Value, CurrentUserId)
            .BindAsync(ancestorIds => Task.FromResult(ancestorIds.Contains(folderId)
                ? Result.Conflict("A folder cannot be moved into its own subtree.")
                : Result.Success()));
    }

    private static Folder UpdateFolder(
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
}
