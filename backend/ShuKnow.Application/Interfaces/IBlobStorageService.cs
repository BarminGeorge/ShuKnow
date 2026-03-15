using Ardalis.Result;

namespace ShuKnow.Application.Interfaces;

using File = Domain.Entities.File;

public interface IBlobStorageService
{
    Task<Result<string>> SaveAsync(Stream content, File file, CancellationToken ct = default);
    
    Task<Result<Stream>> GetAsync(File file, CancellationToken ct = default);
    
    Task<Result<Stream>> GetRangeAsync(
        File file,
        long offset,
        long length,
        CancellationToken ct = default);
    
    Task<Result> DeleteAsync(File file, CancellationToken ct = default);
    
    Task<Result<long>> GetSizeAsync(File file, CancellationToken ct = default);
}
