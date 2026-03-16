using Ardalis.Result;
using ShuKnow.Application.Models;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IFolderService
{
    Task<Result<IReadOnlyList<Folder>>> GetTreeAsync(CancellationToken ct = default);

    Task<Result<IReadOnlyList<FolderSummary>>> GetFolderTreeForPromptAsync(CancellationToken ct = default);
    
    Task<Result<IReadOnlyList<Folder>>> ListAsync(
        Folder? parentFolder = null, 
        CancellationToken ct = default);
    
    Task<Result<Folder>> GetByIdAsync(Guid folderId, CancellationToken ct = default);
    
    Task<Result<IReadOnlyList<Folder>>> GetChildrenAsync(Folder folder, CancellationToken ct = default);
    
    Task<Result<Folder>> CreateAsync(Folder folder, CancellationToken ct = default);
    
    Task<Result<Folder>> UpdateAsync(Folder folder, CancellationToken ct = default);
    
    Task<Result> DeleteAsync(
        Folder folder, 
        bool recursive, 
        CancellationToken ct = default);
    
    Task<Result<Folder>> MoveAsync(
        Folder folder, 
        Folder? newParentFolder = null, 
        CancellationToken ct = default);
    
    Task<Result> ReorderAsync(IReadOnlyList<Folder> siblingsInOrder, CancellationToken ct = default);
    
    Task<Result<Folder>> EnsureInboxExistsAsync(CancellationToken ct = default);
}
