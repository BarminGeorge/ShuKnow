using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Infrastructure.Interfaces;

namespace ShuKnow.Infrastructure.Services;

public class BlobStorageService(IBlobStorageProvider provider) : IBlobStorageService
{
    private const string InvalidRangeMessage = "Byte range must be non-negative and end must be greater than start.";

    public Task<Result> SaveAsync(Stream content, Guid blobId, CancellationToken ct = default)
        => provider.SaveAsync(content, blobId, ct);

    public Task<Result<Stream>> GetAsync(Guid blobId, CancellationToken ct = default)
        => provider.GetAsync(blobId, ct);

    public Task<Result<Stream>> GetRangeAsync(
        Guid blobId, long rangeStart, long rangeEnd, CancellationToken ct = default)
    {
        if (rangeStart < 0 || rangeEnd <= rangeStart)
            return Task.FromResult(Result<Stream>.Invalid(new ValidationError(InvalidRangeMessage)));

        return provider.GetRangeAsync(blobId, rangeStart, rangeEnd, ct);
    }

    public Task<Result> DeleteAsync(Guid blobId, CancellationToken ct = default)
        => provider.DeleteAsync(blobId, ct);

    public Task<Result<long>> GetSizeAsync(Guid blobId, CancellationToken ct = default)
        => provider.GetSizeAsync(blobId, ct);
}
