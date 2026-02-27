using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Repositories;

public interface IFolderRepository
{
    Task<Result<Folder>> GetByIdAsync(Guid id);
    Task<Result<IReadOnlyList<Folder>>> GetRootFoldersByUserIdAsync(Guid userId);
    Task<Result<IReadOnlyList<Folder>>> GetSubFoldersAsync(Guid parentFolderId);
    void Add(Folder folder);
    void Remove(Folder folder);
}
