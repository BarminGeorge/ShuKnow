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
        var folders = await context.Folders
            .AsNoTracking()
            .Where(folder => folder.UserId == userId)
            .OrderBy(folder => folder.SortOrder)
            .ThenBy(folder => folder.Name)
            .ToListAsync();

        var childrenByParentId = folders
            .ToLookup(folder => folder.ParentFolderId);

        var orderedFolders = new List<Folder>(folders.Count);

        AppendSubtree(null, childrenByParentId, orderedFolders);

        return Result.Success<IReadOnlyList<Folder>>(orderedFolders);
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

    public async Task<Result<IReadOnlyList<Guid>>> GetAncestorIdsAsync(Guid folderId)
    {
        var ancestorIds = new List<Guid>();
        var folderLinks = await context.Folders
            .AsNoTracking()
            .Select(folder => new { folder.Id, folder.ParentFolderId })
            .ToDictionaryAsync(folder => folder.Id, folder => folder.ParentFolderId);

        if (!folderLinks.TryGetValue(folderId, out var currentParentId))
            return Result.Success<IReadOnlyList<Guid>>(ancestorIds);

        while (currentParentId.HasValue)
        {
            ancestorIds.Add(currentParentId.Value);
            currentParentId = folderLinks.GetValueOrDefault(currentParentId.Value);
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

    public async Task<Result> DeleteAsync(Guid folderId)
    {
        var trackedFolder = GetTrackedFolder(folderId);

        if (trackedFolder is not null)
        {
            trackedFolder.State = EntityState.Deleted;
            return Result.Success();
        }

        var folder = await context.Folders
            .FirstOrDefaultAsync(folder => folder.Id == folderId);

        if (folder is null)
            return Result.Success();

        context.Folders.Remove(folder);
        return Result.Success();
    }

    public async Task<Result> DeleteSubtreeAsync(Guid folderId)
    {
        var folderLinks = await context.Folders
            .AsNoTracking()
            .Select(folder => new { folder.Id, folder.ParentFolderId })
            .ToListAsync();

        if (folderLinks.All(folder => folder.Id != folderId))
            return Result.Success();

        var childIdsByParentId = folderLinks
            .Where(folder => folder.ParentFolderId.HasValue)
            .GroupBy(folder => folder.ParentFolderId!.Value)
            .ToDictionary(group => group.Key, group => group.Select(folder => folder.Id).ToList());

        var subtreeIds = new List<Guid>();
        var pendingIds = new Queue<Guid>();
        pendingIds.Enqueue(folderId);

        while (pendingIds.Count > 0)
        {
            var currentId = pendingIds.Dequeue();
            subtreeIds.Add(currentId);

            if (!childIdsByParentId.TryGetValue(currentId, out var childIds))
                continue;

            foreach (var childId in childIds)
                pendingIds.Enqueue(childId);
        }

        var folders = await context.Folders
            .Where(folder => subtreeIds.Contains(folder.Id))
            .ToListAsync();

        context.Folders.RemoveRange(folders);

        return Result.Success();
    }

    public async Task<Result<int>> CountByUserAsync(Guid userId)
    {
        var count = await context.Folders
            .AsNoTracking()
            .CountAsync(folder => folder.UserId == userId);

        return Result.Success(count);
    }

    private EntityEntry<Folder>? GetTrackedFolder(Guid folderId)
    {
        return context.ChangeTracker
            .Entries<Folder>()
            .SingleOrDefault(entry => entry.Entity.Id == folderId);
    }

    private static void AppendSubtree(
        Guid? parentId,
        ILookup<Guid?, Folder> childrenByParentId,
        ICollection<Folder> orderedFolders)
    {
        foreach (var child in childrenByParentId[parentId])
        {
            orderedFolders.Add(child);
            AppendSubtree(child.Id, childrenByParentId, orderedFolders);
        }
    }
}
