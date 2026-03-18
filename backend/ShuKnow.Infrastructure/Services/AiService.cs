using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Infrastructure.Services;

internal class AiService : IAiService
{
    public IAsyncEnumerable<string> StreamCompletionAsync(
        string prompt, UserAiSettings settings, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<UserAiSettings>> TestConnectionAsync(UserAiSettings settings, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}