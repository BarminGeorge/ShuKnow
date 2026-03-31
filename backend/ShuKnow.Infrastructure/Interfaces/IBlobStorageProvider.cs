using Ardalis.Result;

namespace ShuKnow.Infrastructure.Interfaces;

public interface IBlobStorageProvider
{
    Task<Result> SaveAsync(Stream content, Guid blobId, CancellationToken ct = default);

    Task<Result<Stream>> GetAsync(Guid blobId, CancellationToken ct = default);

    Task<Result<Stream>> GetRangeAsync(Guid blobId, long rangeStart, long rangeEnd, CancellationToken ct = default);

    Task<Result> DeleteAsync(Guid blobId, CancellationToken ct = default);

    Task<Result<long>> GetSizeAsync(Guid blobId, CancellationToken ct = default);

    Task<Result<bool>> ExistsAsync(Guid blobId, CancellationToken ct = default);

    Task<Result<IReadOnlyList<(Guid BlobId, DateTimeOffset CreatedAt)>>> ListWithTimestampsAsync(
        CancellationToken ct = default);
}
