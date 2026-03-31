using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Infrastructure.Interfaces;

namespace ShuKnow.Infrastructure.Services;

public class BlobStorageService(IBlobStorageProvider provider) : IBlobStorageService
{
    public Task<Result> SaveAsync(Stream content, Guid blobId, CancellationToken ct = default)
        => provider.SaveAsync(content, blobId, ct);

    public Task<Result<Stream>> GetAsync(Guid blobId, CancellationToken ct = default)
        => provider.GetAsync(blobId, ct);

    public Task<Result<Stream>> GetRangeAsync(
        Guid blobId, long rangeStart, long rangeEnd, CancellationToken ct = default)
        => provider.GetRangeAsync(blobId, rangeStart, rangeEnd, ct);

    public Task<Result> DeleteAsync(Guid blobId, CancellationToken ct = default)
        => provider.DeleteAsync(blobId, ct);

    public Task<Result<long>> GetSizeAsync(Guid blobId, CancellationToken ct = default)
        => provider.GetSizeAsync(blobId, ct);
}
