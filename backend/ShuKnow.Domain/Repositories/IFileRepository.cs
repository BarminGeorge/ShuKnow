using Ardalis.Result;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Domain.Repositories;

public interface IFileRepository
{
    Task<Result<File>> GetByIdAsync(Guid fileId, Guid userId);
    
    Task<Result<File>> GetByIdForUpdateAsync(Guid fileId, Guid userId);

    Task<Result<(IReadOnlyList<File> Files, int TotalCount)>> ListByFolderAsync(
        Guid? folderId, Guid userId, int page, int pageSize);

    Task<Result<bool>> ExistsByNameInFolderAsync(
        string name, Guid? folderId, Guid userId, Guid? excludeId = null);

    Task<Result<int>> CountByFolderAsync(Guid? folderId, Guid userId);
    
    Task<Result> AddAsync(File file);
    
    Task<Result> UpdateAsync(File file);

    Task<Result> UpdateRangeAsync(IReadOnlyList<File> files);
    
    Task<Result> DeleteAsync(Guid fileId, Guid userId);
    
    Task<Result<IReadOnlyList<File>>> DeleteByFolderAsync(Guid? folderId, Guid userId);

    Task<Result<IReadOnlyList<File>>> GetByUserAsync(Guid userId);

    Task<Result<IReadOnlyList<File>>> GetByFolderAsync(Guid? folderId, Guid userId);

    Task<Result<File>> GetByFolderAndFileNameAsync(
        Guid? folderId, Guid userId, string fileName);

    Task<Result<IReadOnlySet<Guid>>> GetExistingBlobIdsAsync(
        IReadOnlyCollection<Guid> blobIds,
        CancellationToken ct = default);
}
