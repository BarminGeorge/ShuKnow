using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IFolderService
{
    Task<Result<IReadOnlyList<Folder>>> GetTreeAsync(CancellationToken cancellationToken = default);
    
    Task<Result<IReadOnlyList<Folder>>> ListAsync(
        Folder? parentFolder = null, 
        CancellationToken cancellationToken = default);
    
    Task<Result<Folder>> GetByIdAsync(Guid folderId, CancellationToken cancellationToken = default);
    
    Task<Result<IReadOnlyList<Folder>>> GetChildrenAsync(Folder folder, CancellationToken cancellationToken = default);
    
    Task<Result<Folder>> CreateAsync(Folder folder, CancellationToken cancellationToken = default);
    
    Task<Result<Folder>> UpdateAsync(Folder folder, CancellationToken cancellationToken = default);
    
    Task<Result> DeleteAsync(
        Folder folder, 
        bool recursive, 
        CancellationToken cancellationToken = default);
    
    Task<Result<Folder>> MoveAsync(
        Folder folder, 
        Folder? newParentFolder = null, 
        CancellationToken cancellationToken = default);
    
    Task<Result> ReorderAsync(IReadOnlyList<Folder> siblingsInOrder, CancellationToken cancellationToken = default);
    
    Task<Result<Folder>> EnsureInboxExistsAsync(CancellationToken cancellationToken = default);
}
