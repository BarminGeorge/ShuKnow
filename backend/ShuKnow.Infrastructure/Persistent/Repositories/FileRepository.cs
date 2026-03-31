using Ardalis.Result;
using ShuKnow.Domain.Repositories;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class FileRepository : IFileRepository
{
    public Task<Result<File>> GetByIdAsync(Guid fileId, Guid userId)
    {
        throw new NotImplementedException();
    }

    public Task<Result<File>> GetByIdForUpdateAsync(Guid fileId, Guid userId)
    {
        throw new NotImplementedException();
    }

    public Task<Result<(IReadOnlyList<File> Files, int TotalCount)>> ListByFolderAsync(
        Guid folderId, Guid userId, int page, int pageSize)
    {
        throw new NotImplementedException();
    }

    public Task<Result<bool>> ExistsByNameInFolderAsync(string name, Guid folderId, Guid userId, Guid? excludeId = null)
    {
        throw new NotImplementedException();
    }

    public Task<Result<int>> CountByFolderAsync(Guid folderId)
    {
        throw new NotImplementedException();
    }

    public Task<Result> AddAsync(File file)
    {
        throw new NotImplementedException();
    }

    public Task<Result> UpdateAsync(File file)
    {
        throw new NotImplementedException();
    }

    public Task<Result> DeleteAsync(Guid fileId)
    {
        throw new NotImplementedException();
    }

    public Task<Result<IReadOnlyList<File>>> DeleteByFolderAsync(Guid folderId)
    {
        throw new NotImplementedException();
    }

    public Task<Result<IReadOnlyList<File>>> GetByFolderAsync(Guid folderId)
    {
        throw new NotImplementedException();
    }

    public Task<Result<IReadOnlySet<Guid>>> GetAllBlobIdsAsync()
    {
        throw new NotImplementedException();
    }
}
