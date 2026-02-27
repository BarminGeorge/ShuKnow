using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Repositories;

public interface IChatSessionRepository
{
    Task<Result<ChatSession>> GetByIdAsync(Guid id);
    Task<Result<ChatSession>> GetActiveByUserIdAsync(Guid userId);
    Task<Result<IReadOnlyList<ChatSession>>> GetByUserIdAsync(Guid userId);
    void Add(ChatSession session);
    void Update(ChatSession session);
}
