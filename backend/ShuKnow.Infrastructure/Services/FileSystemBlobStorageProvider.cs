using Ardalis.Result;
using Microsoft.Extensions.Logging;
using ShuKnow.Infrastructure.Interfaces;

namespace ShuKnow.Infrastructure.Services;

public class FileSystemBlobStorageProvider(
    string basePath,
    ILogger<FileSystemBlobStorageProvider> logger) : IBlobStorageProvider
{
    private const int BufferSize = 81920;

    public async Task<Result> SaveAsync(Stream content, Guid blobId, CancellationToken ct = default)
    {
        try
        {
            var filePath = GetBlobPath(blobId);
            Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);

            await using var fileStream = new FileStream(
                filePath, FileMode.CreateNew, FileAccess.Write, FileShare.None, BufferSize, useAsync: true);
            await content.CopyToAsync(fileStream, ct);

            return Result.Success();
        }
        catch (IOException ex) when (ex is not DirectoryNotFoundException)
        {
            logger.LogError(ex, "Failed to save blob {BlobId}", blobId);
            return Result.Error($"Failed to save blob: {ex.Message}");
        }
    }

    public Task<Result<Stream>> GetAsync(Guid blobId, CancellationToken ct = default)
    {
        var filePath = GetBlobPath(blobId);
        if (!File.Exists(filePath))
            return Task.FromResult(Result<Stream>.NotFound($"Blob {blobId} not found."));

        var stream = new FileStream(
            filePath, FileMode.Open, FileAccess.Read, FileShare.Read, BufferSize, useAsync: true);
        return Task.FromResult(Result.Success<Stream>(stream));
    }

    public async Task<Result<Stream>> GetRangeAsync(
        Guid blobId, long rangeStart, long rangeEnd, CancellationToken ct = default)
    {
        if (rangeStart < 0 || rangeEnd <= rangeStart)
            return Result<Stream>.Invalid(
                new ValidationError($"Invalid byte range [{rangeStart}, {rangeEnd})."));

        var filePath = GetBlobPath(blobId);
        if (!File.Exists(filePath))
            return Result<Stream>.NotFound($"Blob {blobId} not found.");

        var fileStream = new FileStream(
            filePath, FileMode.Open, FileAccess.Read, FileShare.Read, BufferSize, useAsync: true);

        if (rangeStart >= fileStream.Length)
        {
            var blobSize = fileStream.Length;
            await fileStream.DisposeAsync();
            return Result<Stream>.Invalid(
                new ValidationError($"Range start {rangeStart} exceeds blob size {blobSize}."));
        }

        var length = Math.Min(rangeEnd - rangeStart, fileStream.Length - rangeStart);

        fileStream.Seek(rangeStart, SeekOrigin.Begin);
        var boundedStream = new BoundedReadStream(fileStream, length);
        return Result.Success<Stream>(boundedStream);
    }

    public Task<Result> DeleteAsync(Guid blobId, CancellationToken ct = default)
    {
        try
        {
            var filePath = GetBlobPath(blobId);
            if (!File.Exists(filePath))
                return Task.FromResult(Result.Success());

            File.Delete(filePath);
            TryDeleteEmptyShardDirectory(blobId);
            return Task.FromResult(Result.Success());
        }
        catch (IOException ex)
        {
            logger.LogError(ex, "Failed to delete blob {BlobId}", blobId);
            return Task.FromResult(Result.Error($"Failed to delete blob: {ex.Message}"));
        }
    }

    public Task<Result<long>> GetSizeAsync(Guid blobId, CancellationToken ct = default)
    {
        var filePath = GetBlobPath(blobId);
        if (!File.Exists(filePath))
            return Task.FromResult(Result<long>.NotFound($"Blob {blobId} not found."));

        var info = new FileInfo(filePath);
        return Task.FromResult(Result.Success(info.Length));
    }

    public Task<Result<bool>> ExistsAsync(Guid blobId, CancellationToken ct = default)
    {
        var filePath = GetBlobPath(blobId);
        return Task.FromResult(Result.Success(File.Exists(filePath)));
    }

    public Task<Result<IReadOnlyList<(Guid BlobId, DateTimeOffset CreatedAt)>>> ListWithTimestampsAsync(
        CancellationToken ct = default)
    {
        var blobs = new List<(Guid BlobId, DateTimeOffset CreatedAt)>();

        if (!Directory.Exists(basePath))
            return Task.FromResult(
                Result.Success<IReadOnlyList<(Guid BlobId, DateTimeOffset CreatedAt)>>(blobs));

        foreach (var (blobId, filePath) in EnumerateBlobs())
        {
            var createdAt = new DateTimeOffset(File.GetCreationTimeUtc(filePath), TimeSpan.Zero);
            blobs.Add((blobId, createdAt));
        }

        return Task.FromResult(
            Result.Success<IReadOnlyList<(Guid BlobId, DateTimeOffset CreatedAt)>>(blobs));
    }

    public string GetBlobPath(Guid blobId)
    {
        var id = blobId.ToString("N");
        var shard = id[..2];
        return Path.Combine(basePath, shard, id);
    }

    private IEnumerable<(Guid BlobId, string FilePath)> EnumerateBlobs()
    {
        foreach (var shardDir in Directory.EnumerateDirectories(basePath))
        foreach (var filePath in Directory.EnumerateFiles(shardDir))
        {
            var fileName = Path.GetFileName(filePath);
            if (Guid.TryParse(fileName, out var blobId))
                yield return (blobId, filePath);
        }
    }

    private void TryDeleteEmptyShardDirectory(Guid blobId)
    {
        try
        {
            var shardDir = Path.GetDirectoryName(GetBlobPath(blobId))!;
            if (Directory.Exists(shardDir) && !Directory.EnumerateFileSystemEntries(shardDir).Any())
                Directory.Delete(shardDir);
        }
        catch (IOException)
        {
            // Best-effort cleanup
        }
    }
}
