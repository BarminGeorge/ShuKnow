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
    
    Task<Result<ChatMessage>> PersistUserMessageAsync(
        ChatMessage message,
        IReadOnlyCollection<Guid>? attachmentIds = null,
        CancellationToken ct = default);
    
    Task<Result<ChatMessage>> PersistAiMessageAsync(
        ChatMessage message,
        CancellationToken ct = default);
    
    Task<Result<ChatMessage>> PersistCancellationRecordAsync(
        ChatMessage message,
        CancellationToken ct = default);
}
