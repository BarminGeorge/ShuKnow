using System.Runtime.CompilerServices;
using System.Threading.Channels;
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

    public async IAsyncEnumerable<(Guid BlobId, DateTimeOffset CreatedAt)> StreamWithTimestampsAsync(
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        if (!Directory.Exists(basePath))
            yield break;

        var channel = Channel.CreateBounded<(Guid BlobId, DateTimeOffset CreatedAt)>(
            new BoundedChannelOptions(256)
            {
                SingleReader = true,
                SingleWriter = true
            });

        var producer = Task.Run(() =>
        {
            try
            {
                foreach (var (blobId, filePath) in EnumerateBlobs())
                {
                    ct.ThrowIfCancellationRequested();

                    var createdAt = new DateTimeOffset(File.GetCreationTimeUtc(filePath), TimeSpan.Zero);
                    channel.Writer.WriteAsync((blobId, createdAt), ct).AsTask().GetAwaiter().GetResult();
                }

                channel.Writer.TryComplete();
            }
            catch (Exception ex)
            {
                channel.Writer.TryComplete(ex);
            }
        }, ct);

        await foreach (var blob in channel.Reader.ReadAllAsync(ct))
            yield return blob;

        await producer;
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
        var shardDir = Path.GetDirectoryName(GetBlobPath(blobId))!;

        try
        {
            if (Directory.Exists(shardDir) && !Directory.EnumerateFileSystemEntries(shardDir).Any())
                Directory.Delete(shardDir);
        }
        catch (IOException)
        {
            logger.LogDebug(
                "Best-effort cleanup failed for shard directory {ShardDir} after deleting blob {BlobId}",
                shardDir,
                blobId);
        }
    }
}
