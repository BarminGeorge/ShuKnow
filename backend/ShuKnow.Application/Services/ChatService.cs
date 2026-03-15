using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Application.Services;

internal class ChatService(
    IChatSessionRepository chatSessionRepository,
    IChatMessageRepository chatMessageRepository,
    ICurrentUserService currentUserService)
    : IChatService
{
    public Task<Result<ChatSession>> GetOrCreateActiveSessionAsync(CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result> DeleteSessionAsync(ChatSession session, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<(IReadOnlyList<ChatMessage> Messages, string? NextCursor)>> GetMessagesAsync(
        ChatSession session, string? cursor, int limit, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<ChatMessage>> PersistUserMessageAsync(
        ChatSession session,
        ChatMessage message,
        IReadOnlyCollection<ChatAttachment>? attachments = null,
        CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<ChatMessage>> PersistAiMessageAsync(
        ChatSession session, ChatMessage message, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<ChatMessage>> PersistCancellationRecordAsync(
        ChatSession session, ChatMessage message, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}