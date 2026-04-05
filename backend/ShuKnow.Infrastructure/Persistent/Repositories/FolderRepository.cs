using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class FolderRepository(AppDbContext context) : IFolderRepository
{
    public async Task<Result<Folder>> GetByIdAsync(Guid folderId, Guid userId)
    {
        var folder = await context.Folders
            .AsNoTracking()
            .FirstOrDefaultAsync(folder => folder.Id == folderId && folder.UserId == userId);

        return folder is null ? Result.NotFound() : Result.Success(folder);
    }

    public async Task<Result<bool>> ExistsByIdAsync(Guid folderId, Guid userId)
    {
        var exists = await context.Folders
            .AsNoTracking()
            .AnyAsync(folder => folder.Id == folderId && folder.UserId == userId);

        return Result.Success(exists);
    }

    public async Task<Result<IReadOnlyList<Folder>>> GetTreeAsync(Guid userId)
    {
        var folders = await FetchUserFoldersAsync(userId);
        return BuildTreeFromFolders(folders);
    }

    private async Task<List<Folder>> FetchUserFoldersAsync(Guid userId)
    {
        return await context.Folders
            .AsNoTracking()
            .Where(folder => folder.UserId == userId)
            .OrderBy(folder => folder.SortOrder)
            .ThenBy(folder => folder.Name)
            .ToListAsync();
    }

    private static Result<IReadOnlyList<Folder>> BuildTreeFromFolders(List<Folder> folders)
    {
        var childrenByParentId = folders.ToLookup(folder => folder.ParentFolderId);
        var orderedFolders = new List<Folder>(folders.Count);
        var visitedFolderIds = new HashSet<Guid>();
        var pathFolderIds = new HashSet<Guid>();

        var rootNodesResult = TryAppendNodes(childrenByParentId[null], childrenByParentId, orderedFolders, visitedFolderIds, pathFolderIds);
        if (!rootNodesResult.IsSuccess) return rootNodesResult.Map();

        var remainingNodesResult = TryAppendNodes(folders, childrenByParentId, orderedFolders, visitedFolderIds, pathFolderIds);
        if (!remainingNodesResult.IsSuccess) return remainingNodesResult.Map();

        return Result.Success<IReadOnlyList<Folder>>(orderedFolders);
    }

    private static Result TryAppendNodes(
        IEnumerable<Folder> nodes,
        ILookup<Guid?, Folder> childrenByParentId,
        List<Folder> orderedFolders,
        HashSet<Guid> visitedFolderIds,
        HashSet<Guid> pathFolderIds)
    {
        foreach (var node in nodes)
        {
            if (visitedFolderIds.Contains(node.Id))
                continue;

            if (!AppendSubtree(node, childrenByParentId, orderedFolders, visitedFolderIds, pathFolderIds))
                return Result.Error("Folder hierarchy cycle detected.");
        }

        return Result.Success();
    }

    public async Task<Result<IReadOnlyList<Folder>>> GetChildrenAsync(Guid parentId, Guid userId)
    {
        var folders = await context.Folders
            .AsNoTracking()
            .Where(folder => folder.UserId == userId && folder.ParentFolderId == parentId)
            .OrderBy(folder => folder.SortOrder)
            .ThenBy(folder => folder.Name)
            .ToListAsync();

        return Result.Success<IReadOnlyList<Folder>>(folders);
    }

    public async Task<Result<IReadOnlyList<Folder>>> GetRootFoldersAsync(Guid userId)
    {
        var folders = await context.Folders
            .AsNoTracking()
            .Where(folder => folder.UserId == userId && folder.ParentFolderId == null)
            .OrderBy(folder => folder.SortOrder)
            .ThenBy(folder => folder.Name)
            .ToListAsync();

        return Result.Success<IReadOnlyList<Folder>>(folders);
    }

    public async Task<Result<IReadOnlyList<Folder>>> GetSiblingsAsync(Guid? parentId, Guid userId)
    {
        var folders = await context.Folders
            .AsNoTracking()
            .Where(folder => folder.UserId == userId && folder.ParentFolderId == parentId)
            .OrderBy(folder => folder.SortOrder)
            .ThenBy(folder => folder.Name)
            .ToListAsync();

        return Result.Success<IReadOnlyList<Folder>>(folders);
    }

    public async Task<Result<IReadOnlyList<Guid>>> GetAncestorIdsAsync(Guid folderId, Guid userId)
    {
        var ancestorIds = new List<Guid>();
        var visitedFolderIds = new HashSet<Guid> { folderId };

        var currentFolder = await context.Folders
            .AsNoTracking()
            .Where(folder => folder.Id == folderId && folder.UserId == userId)
            .Select(folder => new { folder.Id, folder.ParentFolderId })
            .SingleOrDefaultAsync();

        if (currentFolder is null)
            return Result.Success<IReadOnlyList<Guid>>(ancestorIds);

        while (currentFolder.ParentFolderId.HasValue)
        {
            var parentFolderId = currentFolder.ParentFolderId.Value;

            if (!visitedFolderIds.Add(parentFolderId))
                return Result<IReadOnlyList<Guid>>.Error("Folder hierarchy cycle detected.");

            var parentFolder = await context.Folders
                .AsNoTracking()
                .Where(folder => folder.Id == parentFolderId && folder.UserId == userId)
                .Select(folder => new { folder.Id, folder.ParentFolderId })
                .SingleOrDefaultAsync();

            if (parentFolder is null)
                return Result.Success<IReadOnlyList<Guid>>(ancestorIds);

            ancestorIds.Add(parentFolderId);
            currentFolder = parentFolder;
        }

        return Result.Success<IReadOnlyList<Guid>>(ancestorIds);
    }

    public async Task<Result<bool>> ExistsByNameInParentAsync(
        string name, Guid? parentId, Guid userId, Guid? excludeId = null)
    {
        var query = context.Folders
            .AsNoTracking()
            .Where(folder => folder.UserId == userId && folder.ParentFolderId == parentId && folder.Name == name);

        if (excludeId.HasValue)
            query = query.Where(folder => folder.Id != excludeId.Value);

        return Result.Success(await query.AnyAsync());
    }

    public Task<Result> AddAsync(Folder folder)
    {
        context.Folders.Add(folder);
        return Task.FromResult(Result.Success());
    }

    public Task<Result> UpdateAsync(Folder folder)
    {
        var trackedFolder = context.ChangeTracker
            .Entries<Folder>()
            .SingleOrDefault(entry => entry.Entity.Id == folder.Id);

        if (trackedFolder is not null)
        {
            trackedFolder.CurrentValues.SetValues(folder);
            return Task.FromResult(Result.Success());
        }

        context.Folders.Update(folder);
        return Task.FromResult(Result.Success());
    }

    public async Task<Result> DeleteAsync(Guid folderId, Guid userId)
    {
        var trackedFolder = GetTrackedFolder(folderId, userId);

        if (trackedFolder is not null)
        {
            trackedFolder.State = EntityState.Deleted;
            return Result.Success();
        }

        var folder = await context.Folders
            .FirstOrDefaultAsync(folder => folder.Id == folderId && folder.UserId == userId);

        if (folder is null)
            return Result.Success();

        context.Folders.Remove(folder);
        return Result.Success();
    }

    public Task<Result> DeleteSubtreeAsync(Guid folderId, Guid userId)
    {
        return DeleteAsync(folderId, userId);
    }

    public async Task<Result<int>> CountByUserAsync(Guid userId)
    {
        var count = await context.Folders
            .AsNoTracking()
            .CountAsync(folder => folder.UserId == userId);

        return Result.Success(count);
    }

    private EntityEntry<Folder>? GetTrackedFolder(Guid folderId, Guid userId)
    {
        return context.ChangeTracker
            .Entries<Folder>()
            .SingleOrDefault(entry => entry.Entity.Id == folderId && entry.Entity.UserId == userId);
    }

    private static bool AppendSubtree(
        Folder folder,
        ILookup<Guid?, Folder> childrenByParentId,
        ICollection<Folder> orderedFolders,
        ISet<Guid> visitedFolderIds,
        ISet<Guid> pathFolderIds)
    {
        if (!pathFolderIds.Add(folder.Id))
            return false;

        if (visitedFolderIds.Add(folder.Id))
            orderedFolders.Add(folder);

        foreach (var child in childrenByParentId[folder.Id])
        {
            if (!AppendSubtree(child, childrenByParentId, orderedFolders, visitedFolderIds, pathFolderIds))
                return false;
        }

        pathFolderIds.Remove(folder.Id);
        return true;
    }
}
