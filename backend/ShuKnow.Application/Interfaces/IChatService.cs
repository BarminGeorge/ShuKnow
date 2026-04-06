using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IChatService
{
    Task<Result<ChatSession>> GetOrCreateActiveSessionAsync(CancellationToken ct = default);
    
    Task<Result> DeleteSessionAsync(CancellationToken ct = default);
    
    Task<Result<(IReadOnlyList<ChatMessage> Messages, string? NextCursor)>> GetMessagesAsync(
        string? cursor,
        int limit,
        CancellationToken ct = default);
    
    Task<Result<IReadOnlyCollection<ChatMessage>>> GetMessagesAsync(CancellationToken ct = default);

    Task<Result<ChatMessage>> PersistMessageAsync(ChatMessage message, CancellationToken ct = default);
}
