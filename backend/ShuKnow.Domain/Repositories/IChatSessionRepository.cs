using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Repositories;

public interface IChatSessionRepository
{
    Task<Result<ChatSession>> GetActiveAsync(Guid userId);

    Task<Result> AddAsync(ChatSession session);

    Task<Result> DeleteAsync(Guid sessionId);
}