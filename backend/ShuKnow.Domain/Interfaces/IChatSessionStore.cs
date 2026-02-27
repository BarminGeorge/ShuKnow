using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Interfaces;

public interface IChatSessionStore
{
    Task<Result<ChatSession>> GetCurrentAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<Result> SaveCurrentAsync(
        ChatSession chatSession,
        CancellationToken cancellationToken = default);

    Task<Result> CloseCurrentAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<Result> DeleteAsync(
        Guid chatSessionId,
        CancellationToken cancellationToken = default);
}