using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Application.Services;

internal class ActionTrackingService(
    IActionRepository actionRepository,
    ICurrentUserService currentUserService) 
    : IActionTrackingService
{
    public Task<Result<Guid>> BeginActionAsync(Guid sessionId, string summary, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result> RecordFolderCreatedAsync(
        Guid actionId,
        Guid folderId,
        string folderName,
        Guid? parentFolderId = null,
        CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result> RecordFileCreatedAsync(
        Guid actionId,
        Guid fileId,
        Guid folderId,
        string fileName,
        CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result> RecordFileMovedAsync(
        Guid actionId,
        Guid fileId,
        Guid sourceFolderId,
        Guid targetFolderId,
        CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result> MarkRolledBackAsync(Guid actionId, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}