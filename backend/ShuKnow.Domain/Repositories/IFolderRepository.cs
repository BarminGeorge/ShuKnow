using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Repositories;

public interface IFolderRepository
{
    Task<Result<Folder>> GetByIdAsync(Guid id);
    Task<Result<IReadOnlyList<Folder>>> GetByUserIdAsync(Guid userId);
    Task<Result<IReadOnlyList<Folder>>> GetByParentIdAsync(Guid userId, Guid? parentFolderId);
    void Add(Folder folder);
    void Update(Folder folder);
    void Remove(Folder folder);
}
