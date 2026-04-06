using Ardalis.Result;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Interfaces;

public interface ITextFileService
{
    Task<Result<File>> CreateAsync(string filePath, string content, CancellationToken ct = default); 
    
    Task<Result> AppendTextAsync(string filePath, string text, CancellationToken ct = default);

    Task<Result> PrependTextAsync(string filePath, string text, CancellationToken ct = default);
}