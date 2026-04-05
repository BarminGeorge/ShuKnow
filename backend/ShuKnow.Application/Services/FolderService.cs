using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Application.Services;

internal class FolderService(
    IFolderRepository folderRepository,
    IFileRepository fileRepository,
    ICurrentUserService currentUserService) 
    : IFolderService
{
    public Task<Result<IReadOnlyList<Folder>>> GetTreeAsync(CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<IReadOnlyList<FolderSummary>>> GetFolderTreeForPromptAsync(CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<IReadOnlyList<Folder>>> ListAsync(Guid? parentFolderId = null, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<Folder>> GetByIdAsync(Guid folderId, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<Folder>> GetByPathAsync(string folderPath, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<IReadOnlyList<Folder>>> GetChildrenAsync(Guid folderId, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<Folder>> CreateAsync(Folder folder, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<Folder>> CreateByPathAsync(string folderPath, string description, string emoji, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<Folder>> UpdateAsync(Folder folder, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result> DeleteAsync(Guid folderId, bool recursive, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<Folder>> MoveAsync(Guid folderId, Guid? newParentFolderId = null, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result> ReorderAsync(Guid folderId, int position, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}