using Ardalis.Result;

namespace ShuKnow.Application.Interfaces;

public interface IActionTrackingService
{
    Task<Result<Guid>> BeginActionAsync(
        Guid sessionId,
        string summary,
        CancellationToken ct = default);

    Task<Result> RecordFolderCreatedAsync(
        Guid actionId,
        Guid folderId,
        string folderName,
        Guid? parentFolderId = null,
        CancellationToken ct = default);

    Task<Result> RecordFileCreatedAsync(
        Guid actionId,
        Guid fileId,
        Guid? folderId,
        string fileName,
        CancellationToken ct = default);

    Task<Result> RecordFileMovedAsync(
        Guid actionId,
        Guid fileId,
        Guid? sourceFolderId,
        Guid? targetFolderId,
        CancellationToken ct = default);

    Task<Result> MarkRolledBackAsync(
        Guid actionId,
        CancellationToken ct = default);
}
