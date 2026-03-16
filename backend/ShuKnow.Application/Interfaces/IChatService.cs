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
        Guid sessionId,
        ChatMessage message,
        IReadOnlyCollection<Guid>? attachmentIds = null,
        CancellationToken ct = default);
    
    Task<Result<ChatMessage>> PersistAiMessageAsync(
        Guid sessionId,
        ChatMessage message,
        CancellationToken ct = default);
    
    Task<Result<ChatMessage>> PersistCancellationRecordAsync(
        Guid sessionId,
        ChatMessage message,
        CancellationToken ct = default);
}
