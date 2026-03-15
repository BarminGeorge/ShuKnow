using Ardalis.Result;
using ShuKnow.Domain.Entities;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Interfaces;

public interface IFileService
{
    Task<Result<File>> GetByIdAsync(Guid fileId, CancellationToken ct = default);

    Task<Result<(IReadOnlyList<File> Files, int TotalCount)>> ListByFolderAsync(
        Folder folder,
        int page,
        int pageSize,
        CancellationToken ct = default);

    Task<Result<File>> UploadAsync(
        Folder folder,
        File file,
        Stream content,
        CancellationToken ct = default);

    Task<Result<File>> UpdateMetadataAsync(File file, CancellationToken ct = default);

    Task<Result> DeleteAsync(File file, CancellationToken ct = default);

    Task<Result<(Stream Content, string ContentType, long SizeBytes)>> GetContentAsync(
        File file,
        long? rangeStart = null,
        long? rangeEnd = null,
        CancellationToken ct = default);

    Task<Result<File>> ReplaceContentAsync(
        File file,
        Stream content,
        CancellationToken ct = default);

    Task<Result<File>> MoveAsync(
        File file,
        Folder targetFolder,
        CancellationToken ct = default);

    Task<Result> DeleteByFolderAsync(Folder folder, CancellationToken ct = default);
}