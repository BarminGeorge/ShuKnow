using Ardalis.Result;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Interfaces;

public interface IFileService
{
    Task<Result<File>> GetByIdAsync(Guid fileId, CancellationToken ct = default);

    Task<Result<File>> GetByPathAsync(string filePath, CancellationToken ct = default);

    Task<Result<(IReadOnlyList<File> Files, int TotalCount)>> ListByFolderAsync(
        Guid? folderId,
        int page,
        int pageSize,
        CancellationToken ct = default);

    Task<Result<File>> UploadAsync(
        File file,
        Stream content,
        CancellationToken ct = default);

    Task<Result<File>> UpdateMetadataAsync(File file, CancellationToken ct = default);

    Task<Result> DeleteAsync(Guid fileId, CancellationToken ct = default);

    Task<Result<(Stream Content, string ContentType, long SizeBytes)>> GetContentAsync(
        Guid fileId,
        long? rangeStart = null,
        long? rangeEnd = null,
        CancellationToken ct = default);

    Task<Result<File>> ReplaceContentAsync(
        Guid fileId,
        Stream content,
        string contentType,
        CancellationToken ct = default);

    Task<Result<File>> MoveAsync(
        Guid fileId,
        Guid? targetFolderId,
        CancellationToken ct = default);

    Task<Result> DeleteByFolderAsync(Guid? folderId, CancellationToken ct = default);

    Task<Result> ReorderAsync(Guid fileId, int position, CancellationToken ct = default);

    Task<Result<File>> UpdateTextContentAsync(
        Guid fileId,
        string content,
        CancellationToken ct = default);
}
