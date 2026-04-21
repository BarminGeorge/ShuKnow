using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Repositories;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class FileRepository(AppDbContext context) : IFileRepository
{
    public async Task<Result<File>> GetByIdAsync(Guid fileId, Guid userId)
    {
        return await GetByIdAsync(fileId, userId, trackChanges: false);
    }

    public async Task<Result<File>> GetByIdForUpdateAsync(Guid fileId, Guid userId)
    {
        return await GetByIdAsync(fileId, userId, trackChanges: true);
    }

    public async Task<Result<(IReadOnlyList<File> Files, int TotalCount)>> ListByFolderAsync(
        Guid? folderId, Guid userId, int page, int pageSize)
    {
        var query = context.Files
            .AsNoTracking()
            .Where(file => file.FolderId == folderId && file.UserId == userId)
            .OrderBy(file => file.SortOrder)
            .ThenBy(file => file.Name);

        var totalCount = await query.CountAsync();

        var files = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (files, totalCount);
    }

    public async Task<Result<bool>> ExistsByNameInFolderAsync(
        string name, Guid? folderId, Guid userId, Guid? excludeId = null)
    {
        var query = context.Files
            .AsNoTracking()
            .Where(file => file.Name == name && file.FolderId == folderId && file.UserId == userId);

        if (excludeId.HasValue)
            query = query.Where(file => file.Id != excludeId.Value);

        return await query.AnyAsync();
    }

    public async Task<Result<int>> CountByFolderAsync(Guid? folderId, Guid userId)
    {
        return await context.Files
            .AsNoTracking()
            .CountAsync(file => file.FolderId == folderId && file.UserId == userId);
    }

    public Task<Result> AddAsync(File file)
    {
        context.Files.Add(file);
        return Task.FromResult(Result.Success());
    }

    public Task<Result> UpdateAsync(File file)
    {
        context.Files.Update(file);
        return Task.FromResult(Result.Success());
    }

    public Task<Result> UpdateRangeAsync(IReadOnlyList<File> files)
    {
        foreach (var file in files)
        {
            var trackedFile = context.ChangeTracker
                .Entries<File>()
                .SingleOrDefault(entry => entry.Entity.Id == file.Id);

            if (trackedFile is not null)
                trackedFile.CurrentValues.SetValues(file);
            else
                context.Files.Update(file);
        }

        return Task.FromResult(Result.Success());
    }

    public async Task<Result> DeleteAsync(Guid fileId, Guid userId)
    {
        var deleted = await context.Files
            .Where(file => file.Id == fileId && file.UserId == userId)
            .SingleOrDefaultAsync();
        
        if (deleted is null)
            return Result.NotFound($"File with id '{fileId}' was not found.");
        
        context.Files.Remove(deleted);
        return Result.Success();
    }

    public async Task<Result<IReadOnlyList<File>>> DeleteByFolderAsync(Guid? folderId, Guid userId)
    {
        var files = await context.Files
            .AsNoTracking()
            .Where(file => file.FolderId == folderId && file.UserId == userId)
            .ToListAsync();

        context.Files.RemoveRange(files);
        return files;
    }

    public async Task<Result<IReadOnlyList<File>>> GetByFolderAsync(Guid? folderId, Guid userId)
    {
        return await context.Files
            .AsNoTracking()
            .Where(file => file.FolderId == folderId && file.UserId == userId)
            .OrderBy(file => file.SortOrder)
            .ThenBy(file => file.Name)
            .ToListAsync();
    }

    public async Task<Result<File>> GetByFolderAndFileNameAsync(
        Guid? folderId, Guid userId, string fileName)
    {
        var file = await context.Files
            .AsNoTracking()
            .FirstOrDefaultAsync(file =>
                file.FolderId == folderId &&
                file.UserId == userId &&
                file.Name == fileName);

        return file is not null
            ? Result.Success(file)
            : Result<File>.NotFound($"File '{fileName}' was not found in the folder '{folderId}'");
    }

    public async Task<Result<IReadOnlySet<Guid>>> GetExistingBlobIdsAsync(
        IReadOnlyCollection<Guid> blobIds,
        CancellationToken ct = default)
    {
        if (blobIds.Count == 0)
            return new HashSet<Guid>();

        var existingBlobIds = await context.Files
            .AsNoTracking()
            .Where(file => blobIds.Contains(file.BlobId))
            .Select(file => file.BlobId)
            .Distinct()
            .ToListAsync(ct);

        return existingBlobIds.ToHashSet();
    }

    private async Task<Result<File>> GetByIdAsync(Guid fileId, Guid userId, bool trackChanges)
    {
        var query = context.Files.Where(file => file.Id == fileId && file.UserId == userId);
        if (!trackChanges)
            query = query.AsNoTracking();

        var file = await query.FirstOrDefaultAsync();
        return file is not null
            ? Result.Success(file)
            : Result.NotFound($"File with id '{fileId}' was not found.");
    }
}
