using Ardalis.Result;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class FolderRepository : IFolderRepository
{
    public Task<Result<Folder>> GetByIdAsync(Guid folderId, Guid userId)
    {
        throw new NotImplementedException();
    }

    public Task<Result<IReadOnlyList<Folder>>> GetTreeAsync(Guid userId)
    {
        throw new NotImplementedException();
    }

    public Task<Result<IReadOnlyList<Folder>>> GetChildrenAsync(Guid parentId, Guid userId)
    {
        throw new NotImplementedException();
    }

    public Task<Result<IReadOnlyList<Folder>>> GetRootFoldersAsync(Guid userId)
    {
        throw new NotImplementedException();
    }

    public Task<Result<IReadOnlyList<Folder>>> GetSiblingsAsync(Guid? parentId, Guid userId)
    {
        throw new NotImplementedException();
    }

    public Task<Result<IReadOnlyList<Guid>>> GetAncestorIdsAsync(Guid folderId)
    {
        throw new NotImplementedException();
    }

    public Task<Result<bool>> ExistsByNameInParentAsync(
        string name, Guid? parentId, Guid userId, Guid? excludeId = null)
    {
        throw new NotImplementedException();
    }

    public Task<Result> AddAsync(Folder folder)
    {
        throw new NotImplementedException();
    }

    public Task<Result> UpdateAsync(Folder folder)
    {
        throw new NotImplementedException();
    }

    public Task<Result> DeleteAsync(Guid folderId)
    {
        throw new NotImplementedException();
    }

    public Task<Result> DeleteSubtreeAsync(Guid folderId)
    {
        throw new NotImplementedException();
    }

    public Task<Result<int>> CountByUserAsync(Guid userId)
    {
        throw new NotImplementedException();
    }
}