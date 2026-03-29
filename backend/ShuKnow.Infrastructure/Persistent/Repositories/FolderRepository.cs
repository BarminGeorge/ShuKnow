using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
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
            .OrderBy(folder => folder.ParentFolderId)
            .ThenBy(folder => folder.SortOrder)
            .ThenBy(folder => folder.Name)
            .ToListAsync();

        return Result.Success<IReadOnlyList<Folder>>(folders);
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
        var currentParentId = await context.Folders
            .AsNoTracking()
            .Where(folder => folder.Id == folderId)
            .Select(folder => folder.ParentFolderId)
            .SingleOrDefaultAsync();

        while (currentParentId.HasValue)
        {
            ancestorIds.Add(currentParentId.Value);

            currentParentId = await context.Folders
                .AsNoTracking()
                .Where(folder => folder.Id == currentParentId.Value)
                .Select(folder => folder.ParentFolderId)
                .SingleOrDefaultAsync();
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

    public Task<Result> DeleteAsync(Guid folderId)
    {
        var trackedFolder = context.ChangeTracker
            .Entries<Folder>()
            .SingleOrDefault(entry => entry.Entity.Id == folderId);

        if (trackedFolder is not null)
        {
            trackedFolder.State = EntityState.Deleted;
            return Task.FromResult(Result.Success());
        }

        context.Folders.Remove(new Folder(folderId, Guid.Empty, string.Empty, string.Empty));
        return Task.FromResult(Result.Success());
    }

    public async Task<Result> DeleteSubtreeAsync(Guid folderId)
    {
        var subtreeIds = new List<Guid> { folderId };
        var currentLevel = new List<Guid> { folderId };

        while (currentLevel.Count > 0)
        {
            var childIds = await context.Folders
                .AsNoTracking()
                .Where(folder => folder.ParentFolderId.HasValue && currentLevel.Contains(folder.ParentFolderId.Value))
                .Select(folder => folder.Id)
                .ToListAsync();

            if (childIds.Count == 0)
                break;

            subtreeIds.AddRange(childIds);
            currentLevel = childIds;
        }

        var trackedFolders = context.ChangeTracker
            .Entries<Folder>()
            .Where(entry => subtreeIds.Contains(entry.Entity.Id))
            .ToDictionary(entry => entry.Entity.Id);

        foreach (var subtreeId in subtreeIds)
        {
            if (trackedFolders.TryGetValue(subtreeId, out var trackedFolder))
            {
                trackedFolder.State = EntityState.Deleted;
                continue;
            }

            context.Folders.Remove(new Folder(subtreeId, Guid.Empty, string.Empty, string.Empty));
        }

        return Result.Success();
    }

    public async Task<Result<int>> CountByUserAsync(Guid userId)
    {
        var count = await context.Folders
            .AsNoTracking()
            .CountAsync(folder => folder.UserId == userId);

        return Result.Success(count);
    }
}
