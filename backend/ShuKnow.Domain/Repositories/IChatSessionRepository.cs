using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Repositories;

public interface IChatSessionRepository
{
    Task<Result<ChatSession>> GetByIdAsync(Guid id);
    Task<Result<ChatSession>> GetActiveSessionByUserIdAsync(Guid userId);
    void Add(ChatSession session);
    void Remove(ChatSession session);
}
