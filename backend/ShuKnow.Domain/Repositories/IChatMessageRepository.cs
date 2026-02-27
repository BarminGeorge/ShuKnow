using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Repositories;

public interface IChatMessageRepository
{
    Task<Result<IReadOnlyList<ChatMessage>>> GetBySessionIdAsync(Guid userId, Guid sessionId);
    void Add(ChatMessage message);
}
