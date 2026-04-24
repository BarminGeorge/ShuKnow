using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Repositories;

public interface IChatSessionRepository
{
    [Obsolete("Use GetByIdAsync with an explicit session id.")]
    Task<Result<ChatSession>> GetActiveAsync(Guid userId);

    Task<Result<ChatSession>> GetByIdAsync(Guid sessionId, Guid userId);

    Task<Result> AddAsync(ChatSession session);

    Task<Result> DeleteAsync(Guid sessionId);

    Task<Result<int>> DeleteOlderThanAsync(DateTimeOffset cutoff, CancellationToken ct = default);
}
