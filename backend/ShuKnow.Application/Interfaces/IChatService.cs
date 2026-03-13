using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IChatService
{
    Task<Result<ChatSession>> GetOrCreateActiveSessionAsync(CancellationToken cancellationToken = default);
    
    Task<Result> DeleteSessionAsync(ChatSession session, CancellationToken cancellationToken = default);
    
    Task<Result<(IReadOnlyList<ChatMessage> Messages, string? NextCursor)>> GetMessagesAsync(
        ChatSession session,
        string? cursor,
        int limit,
        CancellationToken cancellationToken = default);
    
    Task<Result<ChatMessage>> PersistUserMessageAsync(
        ChatSession session,
        ChatMessage message,
        IReadOnlyCollection<ChatAttachment>? attachments = null,
        CancellationToken cancellationToken = default);
    
    Task<Result<ChatMessage>> PersistAiMessageAsync(
        ChatSession session,
        ChatMessage message,
        CancellationToken cancellationToken = default);
    
    Task<Result<ChatMessage>> PersistCancellationRecordAsync(
        ChatSession session,
        ChatMessage message,
        CancellationToken cancellationToken = default);
}
