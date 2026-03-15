using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Application.Services;

internal class RollbackService(
    IActionRepository actionRepository,
    IFileService fileService,
    IFolderService folderService,
    ICurrentUserService currentUserService)
    : IRollbackService
{
    public Task<Result<UserAction>> RollbackAsync(UserAction action, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<UserAction>> RollbackLastAsync(CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}