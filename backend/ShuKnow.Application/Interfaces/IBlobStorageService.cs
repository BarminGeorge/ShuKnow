using Ardalis.Result;

namespace ShuKnow.Application.Interfaces;

using File = Domain.Entities.File;

public interface IBlobStorageService
{
    Task<Result> SaveAsync(Stream content, File file, CancellationToken ct = default);
    
    Task<Result> ReplaceAsync(Stream content, File file, CancellationToken ct = default);
    
    Task<Result<Stream>> GetAsync(Guid fileId, CancellationToken ct = default);
    
    Task<Result<Stream>> GetRangeAsync(Guid fileId, long rangeStart, long rangeEnd, CancellationToken ct = default);
    
    Task<Result> DeleteAsync(Guid fileId, CancellationToken ct = default);
    
    Task<Result<long>> GetSizeAsync(Guid fileId, CancellationToken ct = default);
}
