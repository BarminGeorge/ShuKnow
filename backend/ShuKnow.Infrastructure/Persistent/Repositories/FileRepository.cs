using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ShuKnow.Domain.Repositories;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class FileRepository(AppDbContext context) : IFileRepository
{
    public async Task<Result<File>> GetByIdAsync(Guid fileId, Guid userId)
    {
        if (fileId == Guid.Empty)
            return Result.Error("File id must not be empty.");

        if (userId == Guid.Empty)
            return Result.Error("User id must not be empty.");

        try
        {
            var file = await context.Files
                .AsNoTracking()
                .Where(f => f.Id == fileId)
                .FirstOrDefaultAsync();

            if (file is null)
                return Result.NotFound($"File with id '{fileId}' was not found.");

            if (file.UserId != userId)
                return Result.Forbidden("You do not have access to this file.");

            return Result.Success(file);
        }
        catch (InvalidOperationException ex)
        {
            return Result.Error($"Unable to load file '{fileId}' because the query returned an invalid result: {ex.Message}");
        }
        catch (TimeoutException ex)
        {
            return Result.Error($"Timed out while loading file '{fileId}': {ex.Message}");
        }
        catch (PostgresException ex)
        {
            return Result.Error($"A database error occurred while loading file '{fileId}': {ex.MessageText}");
        }
        catch (NpgsqlException ex)
        {
            return Result.Error($"A database connection error occurred while loading file '{fileId}': {ex.Message}");
        }
        catch (Exception ex)
        {
            return Result.Error($"An unexpected error occurred while loading file '{fileId}': {ex.Message}");
        }
    }

    public async Task<Result<(IReadOnlyList<File> Files, int TotalCount)>> ListByFolderAsync(
        Guid folderId, Guid userId, int page, int pageSize)
    {
        try
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
        catch (Exception ex)
        {
            return Result.Error(ex.Message);
        }
    }

    public async Task<Result<bool>> ExistsByNameInFolderAsync(
        string name, Guid folderId, Guid userId, Guid? excludeId = null)
    {
        try
        {
            var query = context.Files
                .Where(f => f.Name == name && f.FolderId == folderId && f.Folder.UserId == userId);

            if (excludeId.HasValue)
                query = query.Where(f => f.Id != excludeId.Value);

            return Result.Success(await query.AnyAsync());
        }
        catch (Exception ex)
        {
            return Result.Error(ex.Message);
        }
    }

    public async Task<Result<int>> CountByFolderAsync(Guid folderId, Guid userId)
    {
        try
        {
            var count = await context.Files
                .CountAsync(f => f.FolderId == folderId && f.Folder.UserId == userId);

            return Result.Success(count);
        }
        catch (Exception ex)
        {
            return Result.Error(ex.Message);
        }
    }

    public async Task<Result> AddAsync(File file, Guid userId)
    {
        try
        {
            var folderExists = await context.Folders
                .AnyAsync(f => f.Id == file.FolderId && f.UserId == userId);

            if (!folderExists)
                return Result.NotFound();

            context.Files.Add(file);
            return Result.Success();
        }
        catch (Exception ex)
        {
            return Result.Error(ex.Message);
        }
    }

    public Task<Result> UpdateAsync(File file)
    {
        throw new NotImplementedException();
    }

    public async Task<Result> DeleteAsync(Guid fileId, Guid userId)
    {
        try
        {
            var deleted = await context.Files
                .Where(f => f.Id == fileId && f.Folder.UserId == userId)
                .ExecuteDeleteAsync();

            return deleted == 0 ? Result.NotFound() : Result.Success();
        }
        catch (Exception ex)
        {
            return Result.Error(ex.Message);
        }
    }

    public async Task<Result<IReadOnlyList<File>>> DeleteByFolderAsync(Guid folderId, Guid userId)
    {
        try
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
        catch (Exception ex)
        {
            return Result.Error(ex.Message);
        }
    }

    public async Task<Result<IReadOnlyList<File>>> GetByFolderAsync(Guid folderId, Guid userId)
    {
        try
        {
            var folderExists = await context.Folders
                .AnyAsync(f => f.Id == folderId && f.UserId == userId);

            if (!folderExists)
                return Result.NotFound();

            var files = await context.Files
                .AsNoTracking()
                .Where(f => f.FolderId == folderId && f.Folder.UserId == userId)
                .ToListAsync();

            return Result.Success<IReadOnlyList<File>>(files);
        }
        catch (Exception ex)
        {
            return Result.Error(ex.Message);
        }
    }
}
