using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IChatService
{
    Task<Result<ChatSession>> CreateSessionAsync(CancellationToken ct = default);

    Task<Result<ChatSession>> GetSessionAsync(Guid sessionId, CancellationToken ct = default);
    
    Task<Result> DeleteSessionAsync(Guid sessionId, CancellationToken ct = default);

    Task<Result<(IReadOnlyList<ChatMessage> Messages, string? NextCursor)>> GetMessagesAsync(
        Guid sessionId,
        string? cursor,
        int limit,
        CancellationToken ct = default);
    
    Task<Result<IReadOnlyCollection<ChatMessage>>> GetMessagesAsync(Guid sessionId, CancellationToken ct = default);

    Task<Result<int>> GetMessageCountAsync(Guid sessionId, CancellationToken ct = default);

    Task<Result<ChatMessage>> PersistMessageAsync(ChatMessage message, CancellationToken ct = default);
    
    Task<Result> PersistMessagesAsync(
        IReadOnlyCollection<ChatMessage> messages, 
        CancellationToken ct = default);

    Task<Result<int>> DeleteExpiredSessionsAsync(TimeSpan maxAge, CancellationToken ct = default);
}
