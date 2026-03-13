using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IAiService
{
    IAsyncEnumerable<string> StreamCompletionAsync(
        string prompt,
        UserAiSettings settings,
        CancellationToken cancellationToken = default);
    
    Task<Result<UserAiSettings>> TestConnectionAsync(
        UserAiSettings settings,
        CancellationToken cancellationToken = default);
}
