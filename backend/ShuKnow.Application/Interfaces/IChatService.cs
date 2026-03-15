using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IChatService
{
    Task<Result<ChatSession>> GetOrCreateActiveSessionAsync(CancellationToken ct = default);
    
    Task<Result> DeleteSessionAsync(ChatSession session, CancellationToken ct = default);
    
    Task<Result<(IReadOnlyList<ChatMessage> Messages, string? NextCursor)>> GetMessagesAsync(
        ChatSession session,
        string? cursor,
        int limit,
        CancellationToken ct = default);
    
    Task<Result<ChatMessage>> PersistUserMessageAsync(
        ChatSession session,
        ChatMessage message,
        IReadOnlyCollection<ChatAttachment>? attachments = null,
        CancellationToken ct = default);
    
    Task<Result<ChatMessage>> PersistAiMessageAsync(
        ChatSession session,
        ChatMessage message,
        CancellationToken ct = default);
    
    Task<Result<ChatMessage>> PersistCancellationRecordAsync(
        ChatSession session,
        ChatMessage message,
        CancellationToken ct = default);
}
