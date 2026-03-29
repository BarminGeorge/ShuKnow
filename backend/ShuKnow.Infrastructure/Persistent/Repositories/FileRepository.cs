using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Repositories;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class FileRepository(AppDbContext context) : IFileRepository
{
    public Task<Result<File>> GetByIdAsync(Guid fileId, Guid userId)
    {
        return GetByIdAsync(fileId, userId, trackChanges: false);
    }

    public Task<Result<File>> GetByIdForUpdateAsync(Guid fileId, Guid userId)
    {
        return GetByIdAsync(fileId, userId, trackChanges: true);
    }

    public async Task<Result<(IReadOnlyList<File> Files, int TotalCount)>> ListByFolderAsync(
        Guid folderId, Guid userId, int page, int pageSize)
    {
        if (folderId == Guid.Empty)
            return Result.Error("Folder id must not be empty.");

        if (userId == Guid.Empty)
            return Result.Error("User id must not be empty.");

        if (page <= 0)
            return Result.Error("Page must be greater than zero.");

        if (pageSize <= 0)
            return Result.Error("Page size must be greater than zero.");

        if (!await FolderExistsAsync(folderId, userId))
            return Result.NotFound($"Folder with id '{folderId}' was not found.");

        var query = context.Files
            .AsNoTracking()
            .Where(file => file.FolderId == folderId && file.UserId == userId)
            .OrderBy(file => file.Name);

        var totalCount = await query.CountAsync();
        var files = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Result.Success<(IReadOnlyList<File> Files, int TotalCount)>((files, totalCount));
    }

    public async Task<Result<bool>> ExistsByNameInFolderAsync(
        string name, Guid folderId, Guid userId, Guid? excludeId = null)
    {
        var query = context.Files
            .AsNoTracking()
            .Where(file => file.Name == name && file.FolderId == folderId && file.UserId == userId);

        if (excludeId.HasValue)
            query = query.Where(file => file.Id != excludeId.Value);

        return Result.Success(await query.AnyAsync());
    }

    public async Task<Result<int>> CountByFolderAsync(Guid folderId, Guid userId)
    {
        if (folderId == Guid.Empty)
            return Result.Error("Folder id must not be empty.");

        if (userId == Guid.Empty)
            return Result.Error("User id must not be empty.");

        if (!await FolderExistsAsync(folderId, userId))
            return Result.NotFound($"Folder with id '{folderId}' was not found.");

        var count = await context.Files
            .AsNoTracking()
            .CountAsync(file => file.FolderId == folderId && file.UserId == userId);

        return Result.Success(count);
    }

    public async Task<Result> AddAsync(File file)
    {
        if (file.Id == Guid.Empty)
            return Result.Error("File id must not be empty.");

        if (file.FolderId == Guid.Empty)
            return Result.Error("Folder id must not be empty.");

        if (file.UserId == Guid.Empty)
            return Result.Error("User id must not be empty.");

        if (!await FolderExistsAsync(file.FolderId, file.UserId))
            return Result.NotFound($"Folder with id '{file.FolderId}' was not found.");

        context.Files.Add(file);
        return Result.Success();
    }

    public Task<Result> UpdateAsync(File file)
    {
        if (file.Id == Guid.Empty)
            return Task.FromResult(Result.Error("File id must not be empty."));

        if (file.UserId == Guid.Empty)
            return Task.FromResult(Result.Error("User id must not be empty."));

        context.Files.Update(file);
        return Task.FromResult(Result.Success());
    }

    public async Task<Result> DeleteAsync(Guid fileId, Guid userId)
    {
        if (fileId == Guid.Empty)
            return Result.Error("File id must not be empty.");

        if (userId == Guid.Empty)
            return Result.Error("User id must not be empty.");

        var deleted = await context.Files
            .Where(file => file.Id == fileId && file.UserId == userId)
            .ExecuteDeleteAsync();

        return deleted == 0
            ? Result.NotFound($"File with id '{fileId}' was not found.")
            : Result.Success();
    }

    public async Task<Result<IReadOnlyList<File>>> DeleteByFolderAsync(Guid folderId, Guid userId)
    {
        if (folderId == Guid.Empty)
            return Result.Error("Folder id must not be empty.");

        if (userId == Guid.Empty)
            return Result.Error("User id must not be empty.");

        if (!await FolderExistsAsync(folderId, userId))
            return Result.NotFound($"Folder with id '{folderId}' was not found.");

        var files = await context.Files
            .AsNoTracking()
            .Where(file => file.FolderId == folderId && file.UserId == userId)
            .ToListAsync();

        if (files.Count > 0)
        {
            await context.Files
                .Where(file => file.FolderId == folderId && file.UserId == userId)
                .ExecuteDeleteAsync();
        }

        return Result.Success<IReadOnlyList<File>>(files);
    }

    public async Task<Result<IReadOnlyList<File>>> GetByFolderAsync(Guid folderId, Guid userId)
    {
        if (folderId == Guid.Empty)
            return Result.Error("Folder id must not be empty.");

        if (userId == Guid.Empty)
            return Result.Error("User id must not be empty.");

        if (!await FolderExistsAsync(folderId, userId))
            return Result.NotFound($"Folder with id '{folderId}' was not found.");

        var files = await context.Files
            .AsNoTracking()
            .Where(file => file.FolderId == folderId && file.UserId == userId)
            .OrderBy(file => file.Name)
            .ToListAsync();

        return Result.Success<IReadOnlyList<File>>(files);
    }

    private async Task<Result<File>> GetByIdAsync(Guid fileId, Guid userId, bool trackChanges)
    {
        if (fileId == Guid.Empty)
            return Result.Error("File id must not be empty.");

        if (userId == Guid.Empty)
            return Result.Error("User id must not be empty.");

        var query = context.Files.Where(file => file.Id == fileId);
        if (!trackChanges)
            query = query.AsNoTracking();

        var file = await query.FirstOrDefaultAsync();
        if (file is null)
            return Result.NotFound($"File with id '{fileId}' was not found.");

        return file.UserId == userId
            ? Result.Success(file)
            : Result.Forbidden("You do not have access to this file.");
    }

    private Task<bool> FolderExistsAsync(Guid folderId, Guid userId)
    {
        return context.Folders
            .AsNoTracking()
            .AnyAsync(folder => folder.Id == folderId && folder.UserId == userId);
    }
}
