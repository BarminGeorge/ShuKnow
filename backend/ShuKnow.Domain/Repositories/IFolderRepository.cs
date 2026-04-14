using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Repositories;

public interface IFolderRepository
{
    Task<Result<Folder>> GetByIdAsync(Guid folderId, Guid userId);

    Task<Result<bool>> ExistsByIdAsync(Guid folderId, Guid userId);

    Task<Result<IReadOnlyList<Folder>>> GetTreeAsync(Guid userId);

    Task<Result<IReadOnlyList<Folder>>> GetChildrenAsync(Guid? parentId, Guid userId);

    Task<Result<IReadOnlyList<Folder>>> GetRootFoldersAsync(Guid userId);

    Task<Result<IReadOnlyList<Guid>>> GetAncestorIdsAsync(Guid folderId, Guid userId);

    Task<Result<bool>> ExistsByNameInParentAsync(string name, Guid? parentId, Guid userId, Guid? excludeId = null);

    Task<Result> AddAsync(Folder folder);

    Task<Result> UpdateAsync(Folder folder);

    Task<Result> UpdateRangeAsync(IReadOnlyList<Folder> folders);

    Task<Result> DeleteAsync(Guid folderId, Guid userId);

    Task<Result> DeleteSubtreeAsync(Guid folderId, Guid userId);

    Task<Result<int>> CountByUserAsync(Guid userId);
    Task<Result<Folder>> GetByNameInParentAsync(string name, Guid? parentId, Guid userId);
}
