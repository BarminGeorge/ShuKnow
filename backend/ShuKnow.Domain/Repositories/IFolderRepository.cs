using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Repositories;

public interface IFolderRepository
{
    Task<Result<Folder>> GetByIdAsync(Guid folderId, Guid userId);

    Task<Result<IReadOnlyList<Folder>>> GetTreeAsync(Guid userId);

    Task<Result<IReadOnlyList<Folder>>> GetChildrenAsync(Guid parentId, Guid userId);

    Task<Result<IReadOnlyList<Folder>>> GetRootFoldersAsync(Guid userId);

    Task<Result<IReadOnlyList<Folder>>> GetSiblingsAsync(Guid? parentId, Guid userId);

    Task<Result<IReadOnlyList<Guid>>> GetAncestorIdsAsync(Guid folderId);

    Task<Result<bool>> ExistsByNameInParentAsync(string name, Guid? parentId, Guid userId, Guid? excludeId = null);

    Task<Result> AddAsync(Folder folder);

    Task<Result> UpdateAsync(Folder folder);

    Task<Result> DeleteAsync(Guid folderId);

    Task<Result> DeleteSubtreeAsync(Guid folderId);

    Task<Result<int>> CountByUserAsync(Guid userId);
}