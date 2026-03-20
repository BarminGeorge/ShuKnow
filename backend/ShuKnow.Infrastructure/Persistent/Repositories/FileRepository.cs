using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Repositories;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class FileRepository(AppDbContext context) : IFileRepository
{
    public async Task<Result<File>> GetByIdAsync(Guid fileId, Guid userId)
    {
        var file = await context.Files
            .AsNoTracking()
            .Where(f => f.Id == fileId && f.Folder.UserId == userId)
            .FirstOrDefaultAsync();

        return file is null ? Result.NotFound() : Result.Success(file);
    }

    public async Task<Result<(IReadOnlyList<File> Files, int TotalCount)>> ListByFolderAsync(
        Guid folderId, Guid userId, int page, int pageSize)
    {
        var folderExists = await context.Folders
            .AnyAsync(f => f.Id == folderId && f.UserId == userId);

        if (!folderExists)
            return Result.NotFound();

        var files = await context.Files
            .AsNoTracking()
            .Where(f => f.FolderId == folderId && f.Folder.UserId == userId)
            .OrderBy(f => f.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Result.Success<(IReadOnlyList<File> Files, int TotalCount)>((files, files.Count));
    }

    public async Task<Result<bool>> ExistsByNameInFolderAsync(
        string name, Guid folderId, Guid userId, Guid? excludeId = null)
    {
        var query = context.Files
            .Where(f => f.Name == name && f.FolderId == folderId && f.Folder.UserId == userId);

        if (excludeId.HasValue)
            query = query.Where(f => f.Id != excludeId.Value);

        return Result.Success(await query.AnyAsync());
    }

    public async Task<Result<int>> CountByFolderAsync(Guid folderId, Guid userId)
    {
        var count = await context.Files
            .CountAsync(f => f.FolderId == folderId && f.Folder.UserId == userId);

        return Result.Success(count);
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

    public async Task<Result> DeleteAsync(Guid fileId, Guid userId)
    {
        var deleted = await context.Files
            .Where(f => f.Id == fileId && f.Folder.UserId == userId)
            .ExecuteDeleteAsync();

        return deleted == 0 ? Result.NotFound() : Result.Success();
    }

    public async Task<Result<IReadOnlyList<File>>> DeleteByFolderAsync(Guid folderId, Guid userId)
    {
        var files = await context.Files
            .AsNoTracking()
            .Where(f => f.FolderId == folderId && f.Folder.UserId == userId)
            .ToListAsync();

        await context.Files
            .Where(f => f.FolderId == folderId && f.Folder.UserId == userId)
            .ExecuteDeleteAsync();

        return Result.Success<IReadOnlyList<File>>(files);
    }

    public async Task<Result<IReadOnlyList<File>>> GetByFolderAsync(Guid folderId, Guid userId)
    {
        var files = await context.Files
            .AsNoTracking()
            .Where(f => f.FolderId == folderId && f.Folder.UserId == userId)
            .ToListAsync();

        return Result.Success<IReadOnlyList<File>>(files);
    }
}