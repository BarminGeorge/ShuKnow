using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Interfaces;

public interface IAIService
{
    Task<Result<string>> CompleteChatAsync(
        string baseUrl,
        string bearerToken,
        IReadOnlyCollection<ChatMessage> messages,
        CancellationToken cancellationToken = default);
}
