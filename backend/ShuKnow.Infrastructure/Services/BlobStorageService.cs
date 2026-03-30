using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Infrastructure.Services;

internal class BlobStorageService : IBlobStorageService
{
    public Task<Result> SaveAsync(Stream content, File file, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result> SaveAsync(Stream content, Guid id, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result> ReplaceAsync(Stream content, File file, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<Stream>> GetAsync(Guid fileId, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<Stream>> GetRangeAsync(
        Guid fileId, long rangeStart, long rangeEnd, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result> DeleteAsync(Guid fileId, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<long>> GetSizeAsync(Guid fileId, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}
