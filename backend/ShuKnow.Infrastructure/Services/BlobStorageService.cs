using Ardalis.Result;
using Microsoft.Extensions.Configuration;
using ShuKnow.Application.Interfaces;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Infrastructure.Services;

internal class BlobStorageService(IConfiguration configuration) : IBlobStorageService
{
    private const string DefaultStorageDirectory = "blob-storage";
    private const int BufferSizeBytes = 81920;

    private readonly string storageRootPath = Path.GetFullPath(
        configuration["BlobStorage:RootPath"]
        ?? Path.Combine(AppContext.BaseDirectory, DefaultStorageDirectory));

    public Task<Result> SaveAsync(Stream content, File file, CancellationToken ct = default)
    {
        var path = GetBlobPath(file.Id);
        if (System.IO.File.Exists(path))
            return Task.FromResult(Result.Conflict("Blob already exists."));

        return WriteAsync(content, path, ct);
    }

    public Task<Result> ReplaceAsync(Stream content, File file, CancellationToken ct = default)
    {
        var path = GetBlobPath(file.Id);
        if (!System.IO.File.Exists(path))
            return Task.FromResult(Result.NotFound());

        return WriteAsync(content, path, ct);
    }

    public async Task<Result<Stream>> GetAsync(Guid fileId, CancellationToken ct = default)
    {
        try
        {
            var path = GetBlobPath(fileId);
            if (!System.IO.File.Exists(path))
                return Result.NotFound();

            await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
            var copy = new MemoryStream();
            await stream.CopyToAsync(copy, ct);
            copy.Position = 0;

            return Result.Success<Stream>(copy);
        }
        catch (IOException)
        {
            return Result.Error("Blob read failed.");
        }
        catch (UnauthorizedAccessException)
        {
            return Result.Error("Blob read failed.");
        }
    }

    public async Task<Result<Stream>> GetRangeAsync(
        Guid fileId, long rangeStart, long rangeEnd, CancellationToken ct = default)
    {
        try
        {
            var path = GetBlobPath(fileId);
            if (!System.IO.File.Exists(path))
                return Result.NotFound();

            var fileInfo = new FileInfo(path);
            if (rangeStart < 0 || rangeStart >= fileInfo.Length || rangeEnd <= rangeStart)
                return Result.Error("Invalid range.");

            var effectiveRangeEnd = Math.Min(rangeEnd, fileInfo.Length);
            var rangeLength = effectiveRangeEnd - rangeStart;

            await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
            stream.Seek(rangeStart, SeekOrigin.Begin);

            var buffer = new byte[BufferSizeBytes];
            var remaining = rangeLength;
            var resultStream = new MemoryStream();

            while (remaining > 0)
            {
                var bytesToRead = (int)Math.Min(buffer.Length, remaining);
                var bytesRead = await stream.ReadAsync(buffer.AsMemory(0, bytesToRead), ct);
                if (bytesRead == 0)
                    break;

                await resultStream.WriteAsync(buffer.AsMemory(0, bytesRead), ct);
                remaining -= bytesRead;
            }

            resultStream.Position = 0;
            return Result.Success<Stream>(resultStream);
        }
        catch (IOException)
        {
            return Result.Error("Blob read failed.");
        }
        catch (UnauthorizedAccessException)
        {
            return Result.Error("Blob read failed.");
        }
    }

    public Task<Result> DeleteAsync(Guid fileId, CancellationToken ct = default)
    {
        try
        {
            var path = GetBlobPath(fileId);
            if (!System.IO.File.Exists(path))
                return Task.FromResult(Result.Success());

            System.IO.File.Delete(path);
            return Task.FromResult(Result.Success());
        }
        catch (IOException)
        {
            return Task.FromResult(Result.Error("Blob delete failed."));
        }
        catch (UnauthorizedAccessException)
        {
            return Task.FromResult(Result.Error("Blob delete failed."));
        }
    }

    public Task<Result<long>> GetSizeAsync(Guid fileId, CancellationToken ct = default)
    {
        try
        {
            var path = GetBlobPath(fileId);
            if (!System.IO.File.Exists(path))
                return Task.FromResult(Result<long>.NotFound());

            var fileInfo = new FileInfo(path);
            return Task.FromResult(Result.Success(fileInfo.Length));
        }
        catch (IOException)
        {
            return Task.FromResult(Result<long>.Error("Blob metadata read failed."));
        }
        catch (UnauthorizedAccessException)
        {
            return Task.FromResult(Result<long>.Error("Blob metadata read failed."));
        }
    }

    private async Task<Result> WriteAsync(Stream content, string path, CancellationToken ct)
    {
        try
        {
            var directory = Path.GetDirectoryName(path);
            if (!string.IsNullOrWhiteSpace(directory))
                Directory.CreateDirectory(directory);

            await using var fileStream = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None);
            await content.CopyToAsync(fileStream, ct);
            return Result.Success();
        }
        catch (IOException)
        {
            return Result.Error("Blob write failed.");
        }
        catch (UnauthorizedAccessException)
        {
            return Result.Error("Blob write failed.");
        }
    }

    private string GetBlobPath(Guid fileId)
    {
        return Path.Combine(storageRootPath, $"{fileId:N}.blob");
    }
}
