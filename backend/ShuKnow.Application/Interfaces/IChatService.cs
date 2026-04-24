using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IChatService
{
    [Obsolete("Use CreateSessionAsync or GetSessionAsync with an explicit session id.")]
    Task<Result<ChatSession>> GetOrCreateActiveSessionAsync(CancellationToken ct = default);

    Task<Result<ChatSession>> CreateSessionAsync(CancellationToken ct = default);

    Task<Result<ChatSession>> GetSessionAsync(Guid sessionId, CancellationToken ct = default);
    
    [Obsolete("Use DeleteSessionAsync with an explicit session id.")]
    Task<Result> DeleteSessionAsync(CancellationToken ct = default);

    Task<Result> DeleteSessionAsync(Guid sessionId, CancellationToken ct = default);

    [Obsolete("Use GetMessagesAsync with an explicit session id.")]
    Task<Result<(IReadOnlyList<ChatMessage> Messages, string? NextCursor)>> GetMessagesAsync(
        string? cursor,
        int limit,
        CancellationToken ct = default);
    
    Task<Result<(IReadOnlyList<ChatMessage> Messages, string? NextCursor)>> GetMessagesAsync(
        Guid sessionId,
        string? cursor,
        int limit,
        CancellationToken ct = default);
    
    Task<Result<IReadOnlyCollection<ChatMessage>>> GetMessagesAsync(Guid sessionId, CancellationToken ct = default);

    [Obsolete("Use GetMessagesAsync with an explicit session id.")]
    Task<Result<IReadOnlyCollection<ChatMessage>>> GetMessagesAsync(CancellationToken ct = default);

    Task<Result<int>> GetMessageCountAsync(Guid sessionId, CancellationToken ct = default);

    [Obsolete("Use GetMessageCountAsync with an explicit session id.")]
    Task<Result<int>> GetMessageCountAsync(CancellationToken ct = default);

    Task<Result<ChatMessage>> PersistMessageAsync(ChatMessage message, CancellationToken ct = default);
    
    Task<Result> PersistMessagesAsync(
        IReadOnlyCollection<ChatMessage> messages, 
        CancellationToken ct = default);

    Task<Result<int>> DeleteExpiredSessionsAsync(TimeSpan maxAge, CancellationToken ct = default);
}
