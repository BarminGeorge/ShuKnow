using Ardalis.Result;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Errors;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Application.Services;

internal class FolderService(
    IFolderRepository folderRepository,
    IFileRepository fileRepository,
    IBlobDeletionQueue blobDeletionQueue,
    IWorkspacePathService workspacePathService,
    ICurrentUserService currentUserService,
    IUnitOfWork unitOfWork)
    : IFolderService
{
    private const int MaxFolderDepth = 32;
    private const string MaxFolderDepthExceededMessage = "Глубина вложенности папок не может превышать 32 уровня.";
    private const string FolderHierarchyCycleMessage = "В иерархии папок обнаружен цикл.";

    private Guid CurrentUserId => currentUserService.UserId;

    public Task<Result<IReadOnlyList<Folder>>> GetTreeAsync(CancellationToken ct = default) =>
        folderRepository.GetTreeAsync(CurrentUserId);

    public Task<Result<IReadOnlyList<FolderSummary>>> GetFolderTreeForPromptAsync(CancellationToken ct = default)
    {
        return GetTreeAsync(ct)
            .MapAsync(folders => (IReadOnlyList<FolderSummary>)folders
                .Select(folder => new FolderSummary(folder.Id, folder.Name, folder.Description, folder.ParentFolderId))
                .ToList());
    }

    public Task<Result<IReadOnlyList<Folder>>> ListAsync(Guid? parentFolderId = null, CancellationToken ct = default) =>
        ListInternalAsync(parentFolderId);

    public Task<Result<Folder>> GetByIdAsync(Guid folderId, CancellationToken ct = default) =>
        folderRepository.GetByIdAsync(folderId, CurrentUserId);
    
    public async Task<Result<Folder>> GetByPathAsync(string folderPath, CancellationToken ct = default)
    {
        return await workspacePathService.ResolveFolderAsync(folderPath, ct);
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
            .BindAsync(_ => EnsureCreateDepthIsValidAsync(folder.ParentFolderId))
            .BindAsync(_ => folderRepository.GetChildrenAsync(folder.ParentFolderId, CurrentUserId))
            .MapAsync(siblings => new Folder(
                folder.Id,
                CurrentUserId,
                folder.Name,
                folder.Description,
                folder.ParentFolderId,
                siblings.Count,
                folder.Emoji))
            .ActAsync(folderRepository.AddAsync)
            .SaveChangesAsync(unitOfWork)
            .ToCreatedAsync();
    }
    
    public async Task<Result<Folder>> CreateByPathAsync(
        string folderPath,
        string description,
        string emoji,
        CancellationToken ct = default)
    {
        return await workspacePathService.ResolveFolderCreationPathAsync(folderPath, ct)
            .MapAsync(path => new Folder(
                Guid.NewGuid(),
                CurrentUserId,
                path.FolderName,
                description,
                path.ParentFolderId,
                emoji: emoji))
            .BindAsync(folder => CreateAsync(folder, ct));
    }

    public async Task<Result<Folder>> UpdateAsync(Folder folder, CancellationToken ct = default)
    {
        return await GetByIdAsync(folder.Id, ct)
            .ActAsync(existingFolder 
                => EnsureFolderNameUniqueAsync(folder.Name, existingFolder.ParentFolderId, existingFolder.Id))
            .MapAsync(existingFolder => UpdateFolder(
                existingFolder,
                name: folder.Name,
                description: folder.Description,
                emoji: folder.Emoji))
            .ActAsync(folderRepository.UpdateAsync)
            .SaveChangesAsync(unitOfWork);
    }

    public async Task<Result> DeleteAsync(Guid folderId, CancellationToken ct = default)
    {
        return await GetByIdAsync(folderId, ct)
            .BindAsync(_ => GetSubtreeFolderIdsAsync(folderId))
            .BindAsync(DeleteFilesByFoldersAsync)
            .ActAsync(_ => folderRepository.DeleteSubtreeAsync(folderId, CurrentUserId))
            .SaveChangesAsync(unitOfWork)
            .ActAsync(EnqueueDeletesAsync)
            .BindAsync(_ => Result.Success());
    }

    public async Task<Result<Folder>> MoveAsync(Guid folderId, Guid? newParentFolderId = null,
        CancellationToken ct = default)
    {
        return await GetByIdAsync(folderId, ct)
            .BindAsync(existingFolder =>
            {
                if (existingFolder.ParentFolderId == newParentFolderId)
                    return Task.FromResult(Result.Success(existingFolder));

                return EnsureMoveIsValidAsync(existingFolder.Id, existingFolder.Name, newParentFolderId)
                    .BindAsync(_ => folderRepository.GetChildrenAsync(newParentFolderId, CurrentUserId))
                    .MapAsync(siblings => UpdateFolder(
                        existingFolder,
                        newParentFolderId: newParentFolderId,
                        updateParentFolderId: true,
                        sortOrder: siblings.Count))
                    .ActAsync(folderRepository.UpdateAsync)
                    .SaveChangesAsync(unitOfWork);
            });
    }

    public async Task<Result> ReorderAsync(Guid folderId, int position, CancellationToken ct = default)
    {
        return await EnsurePositionValidAsync(position)
            .BindAsync(_ => GetByIdAsync(folderId, ct))
            .BindAsync(folder => folderRepository.GetChildrenAsync(folder.ParentFolderId, CurrentUserId))
            .BindAsync(siblings => ApplyReorderAsync(siblings, folderId, position));
    }

    private async Task<Result> ApplyReorderAsync(IReadOnlyList<Folder> siblings, Guid folderId, int position)
    {
        var reorderedFolders = siblings.ToList();
        var currentIndex = reorderedFolders.FindIndex(folder => folder.Id == folderId);
        if (currentIndex < 0)
            return Result.NotFound(ResultErrorMessages.NotFound);

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

        return existsResult.Value ? Result.Success() : Result.NotFound(ResultErrorMessages.NotFound);
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
        var existsResult =
            await folderRepository.ExistsByNameInParentAsync(name, parentFolderId, CurrentUserId, excludeId);
        if (!existsResult.IsSuccess)
            return existsResult.Map();

        return existsResult.Value ? Result.Conflict("Conflict: Folder already exists") : Result.Success();
    }

    private async Task<Result> EnsureMoveIsValidAsync(Guid folderId, string folderName, Guid? newParentFolderId)
    {
        return await EnsureNotMovingIntoSelfAsync(folderId, newParentFolderId)
            .BindAsync(_ => EnsureParentFolderExistsAsync(newParentFolderId))
            .BindAsync(_ => EnsureFolderNameUniqueAsync(folderName, newParentFolderId, folderId))
            .BindAsync(_ => EnsureNotMovingIntoSubtreeAsync(folderId, newParentFolderId))
            .BindAsync(_ => EnsureMoveDepthIsValidAsync(folderId, newParentFolderId));
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

        var ancestorsResult = await folderRepository.GetAncestorIdsAsync(newParentFolderId.Value, CurrentUserId);
        if (!ancestorsResult.IsSuccess)
            return Result.Conflict(FolderHierarchyCycleMessage);

        return ancestorsResult.Value.Contains(folderId)
            ? Result.Conflict("A folder cannot be moved into its own subtree.")
            : Result.Success();
    }

    private async Task<Result> EnsureCreateDepthIsValidAsync(Guid? parentFolderId)
    {
        if (!parentFolderId.HasValue)
            return Result.Success();

        var ancestorsResult = await folderRepository.GetAncestorIdsAsync(parentFolderId.Value, CurrentUserId);
        if (!ancestorsResult.IsSuccess)
            return Result.Conflict(FolderHierarchyCycleMessage);

        return ancestorsResult.Value.Count + 2 > MaxFolderDepth
            ? Result.Conflict(MaxFolderDepthExceededMessage)
            : Result.Success();
    }

    private async Task<Result> EnsureMoveDepthIsValidAsync(Guid folderId, Guid? newParentFolderId)
    {
        var targetDepthResult = await GetTargetDepthAsync(newParentFolderId);
        if (!targetDepthResult.IsSuccess)
            return targetDepthResult.Map();

        var subtreeDepthResult = await GetSubtreeDepthAsync(folderId);
        if (!subtreeDepthResult.IsSuccess)
            return subtreeDepthResult.Map();

        return targetDepthResult.Value + subtreeDepthResult.Value > MaxFolderDepth
            ? Result.Conflict(MaxFolderDepthExceededMessage)
            : Result.Success();
    }

    private async Task<Result<int>> GetTargetDepthAsync(Guid? parentFolderId)
    {
        if (!parentFolderId.HasValue)
            return Result.Success(0);

        var ancestorsResult = await folderRepository.GetAncestorIdsAsync(parentFolderId.Value, CurrentUserId);
        if (!ancestorsResult.IsSuccess)
            return Result<int>.Conflict(FolderHierarchyCycleMessage);

        return Result.Success(ancestorsResult.Value.Count + 1);
    }

    private async Task<Result<int>> GetSubtreeDepthAsync(Guid folderId)
    {
        return await folderRepository.GetTreeAsync(CurrentUserId)
            .BindAsync(folders => Task.FromResult(GetSubtreeDepth(folderId, folders)));
    }

    private static Result<int> GetSubtreeDepth(Guid folderId, IReadOnlyList<Folder> folders)
    {
        var foldersByParentId = folders.ToLookup(folder => folder.ParentFolderId);
        var maxDepth = 0;
        var stack = new Stack<(Guid FolderId, int Depth, HashSet<Guid> Path)>();
        stack.Push((folderId, 1, [folderId]));

        while (stack.Count > 0)
        {
            var (currentFolderId, depth, path) = stack.Pop();
            maxDepth = Math.Max(maxDepth, depth);

            foreach (var child in foldersByParentId[currentFolderId])
            {
                if (path.Contains(child.Id))
                    return Result<int>.Conflict(FolderHierarchyCycleMessage);

                stack.Push((child.Id, depth + 1, [..path, child.Id]));
            }
        }

        return Result.Success(maxDepth);
    }

    private async Task<Result<IReadOnlyList<Guid>>> GetSubtreeFolderIdsAsync(Guid folderId)
    {
        return await folderRepository.GetTreeAsync(CurrentUserId)
            .MapAsync(folders => GetSubtreeFolderIds(folderId, folders));
    }

    private async Task<Result<IReadOnlyList<Guid>>> DeleteFilesByFoldersAsync(IReadOnlyList<Guid> folderIds)
    {
        var deleteTasks = folderIds
            .Select(folderId => fileRepository.DeleteByFolderAsync(folderId, CurrentUserId))
            .ToList();

        var results = await Task.WhenAll(deleteTasks);

        var firstError = results.FirstOrDefault(r => !r.IsSuccess);
        if (firstError is not null)
            return firstError.Map();

        var allBlobIds = results
            .SelectMany(r => r.Value.Select(file => file.BlobId))
            .ToList();

        return allBlobIds;
    }

    private async Task EnqueueDeletesAsync(IEnumerable<Guid> blobIds)
    {
        var enqueueTasks = blobIds
            .Where(blobId => blobId != Guid.Empty)
            .Distinct()
            .Select(blobId => blobDeletionQueue.EnqueueDeleteAsync(blobId).AsTask());

        await Task.WhenAll(enqueueTasks);
    }

    private static IReadOnlyList<Guid> GetSubtreeFolderIds(Guid folderId, IReadOnlyList<Folder> folders)
    {
        var foldersByParentId = folders.ToLookup(folder => folder.ParentFolderId);
        var subtreeFolderIds = new List<Guid> { folderId };
        AppendDescendantFolderIds(folderId, foldersByParentId, subtreeFolderIds);
        return subtreeFolderIds;
    }

    private static void AppendDescendantFolderIds(
        Guid folderId,
        ILookup<Guid?, Folder> foldersByParentId,
        ICollection<Guid> subtreeFolderIds)
    {
        var visitedFolderIds = new HashSet<Guid> { folderId };
        var stack = new Stack<Guid>(foldersByParentId[folderId].Select(folder => folder.Id));

        while (stack.Count > 0)
        {
            var currentFolderId = stack.Pop();
            if (!visitedFolderIds.Add(currentFolderId))
                continue;

            subtreeFolderIds.Add(currentFolderId);

            foreach (var child in foldersByParentId[currentFolderId])
                stack.Push(child.Id);
        }
    }

    private static Folder UpdateFolder(
        Folder source,
        string? name = null,
        string? description = null,
        Guid? newParentFolderId = null,
        bool updateParentFolderId = false,
        int? sortOrder = null,
        string? emoji = null)
    {
        return new Folder(
            source.Id,
            source.UserId,
            name ?? source.Name,
            description ?? source.Description,
            updateParentFolderId ? newParentFolderId : source.ParentFolderId,
            sortOrder ?? source.SortOrder,
            emoji ?? source.Emoji);
    }
}
