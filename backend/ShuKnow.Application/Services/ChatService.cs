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

    public Task<Result> DeleteSessionAsync(CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<(IReadOnlyList<ChatMessage> Messages, string? NextCursor)>> GetMessagesAsync(
        string? cursor, int limit, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<ChatMessage>> PersistUserMessageAsync(ChatMessage message,
        IReadOnlyCollection<Guid>? attachmentIds = null,
        CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<ChatMessage>> PersistAiMessageAsync(ChatMessage message, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<ChatMessage>> PersistCancellationRecordAsync(ChatMessage message, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}