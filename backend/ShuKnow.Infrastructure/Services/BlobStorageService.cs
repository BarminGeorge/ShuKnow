using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Infrastructure.Services;

internal class BlobStorageService : IBlobStorageService
{
    public Task<Result<string>> SaveAsync(Stream content, File file, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<Stream>> GetAsync(File file, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<Stream>> GetRangeAsync(File file, long offset, long length, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result> DeleteAsync(File file, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<long>> GetSizeAsync(File file, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}
