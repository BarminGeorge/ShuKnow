using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Repositories;

public interface IChatMessageRepository
{
    Task<Result> AddAsync(ChatMessage message);
    
    Task<Result> AddRangeAsync(IReadOnlyCollection<ChatMessage> messages);

    Task<Result<IReadOnlyCollection<ChatMessage>>> GetBySessionAsync(Guid sessionId);

    Task<Result<(IReadOnlyList<ChatMessage> Messages, string? NextCursor)>> GetPageAsync(
        Guid sessionId,
        string? cursor,
        int limit);

    Task<Result<int>> CountBySessionAsync(Guid sessionId);

    Task<Result> DeleteBySessionAsync(Guid sessionId);
}
