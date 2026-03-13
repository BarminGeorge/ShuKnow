using Ardalis.Result;

namespace ShuKnow.Application.Interfaces;

using File = Domain.Entities.File;

public interface IBlobStorageService
{
    Task<Result<string>> SaveAsync(Stream content, File file, CancellationToken cancellationToken = default);
    
    Task<Result<Stream>> GetAsync(File file, CancellationToken cancellationToken = default);
    
    Task<Result<Stream>> GetRangeAsync(
        File file,
        long offset,
        long length,
        CancellationToken cancellationToken = default);
    
    Task<Result> DeleteAsync(File file, CancellationToken cancellationToken = default);
    
    Task<Result<long>> GetSizeAsync(File file, CancellationToken cancellationToken = default);
}
