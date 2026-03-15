using Ardalis.Result;
using ShuKnow.Application.Interfaces;
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

    public Task<Result<IReadOnlyList<Folder>>> ListAsync(Folder? parentFolder = null, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<Folder>> GetByIdAsync(Guid folderId, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<IReadOnlyList<Folder>>> GetChildrenAsync(Folder folder, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<Folder>> CreateAsync(Folder folder, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<Folder>> UpdateAsync(Folder folder, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result> DeleteAsync(Folder folder, bool recursive, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<Folder>> MoveAsync(Folder folder, Folder? newParentFolder = null, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result> ReorderAsync(IReadOnlyList<Folder> siblingsInOrder, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<Folder>> EnsureInboxExistsAsync(CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}