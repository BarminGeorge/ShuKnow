using Ardalis.Result;
using ShuKnow.Application.Models;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IFolderService
{
    Task<Result<IReadOnlyList<Folder>>> GetTreeAsync(CancellationToken ct = default);

    Task<Result<IReadOnlyList<FolderSummary>>> GetFolderTreeForPromptAsync(CancellationToken ct = default);
    
    Task<Result<IReadOnlyList<Folder>>> ListAsync(
        Guid? parentFolderId = null,
        CancellationToken ct = default);
    
    Task<Result<Folder>> GetByIdAsync(Guid folderId, CancellationToken ct = default);

    Task<Result<Folder>> GetByPathAsync(string folderPath, CancellationToken ct = default);
    
    Task<Result<IReadOnlyList<Folder>>> GetChildrenAsync(Guid folderId, CancellationToken ct = default);
    
    Task<Result<Folder>> CreateAsync(Folder folder, CancellationToken ct = default);

    Task<Result<Folder>> CreateByPathAsync(
        string folderPath, 
        string description, 
        string emoji,
        CancellationToken ct = default);
    
    Task<Result<Folder>> UpdateAsync(Folder folder, CancellationToken ct = default);
    
    Task<Result> DeleteAsync(
        Guid folderId,
        bool recursive, 
        CancellationToken ct = default);
    
    Task<Result<Folder>> MoveAsync(
        Guid folderId,
        Guid? newParentFolderId = null,
        CancellationToken ct = default);
    
    Task<Result> ReorderAsync(Guid folderId, int position, CancellationToken ct = default);
}
