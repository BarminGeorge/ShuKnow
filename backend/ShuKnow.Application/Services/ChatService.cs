using Ardalis.Result;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Errors;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Application.Services;

public class ChatService(
    IChatSessionRepository chatSessionRepository,
    IChatMessageRepository chatMessageRepository,
    ICurrentUserService currentUserService,
    IUnitOfWork unitOfWork)
    : IChatService
{
    private Guid CurrentUserId => currentUserService.UserId;

    [Obsolete("Use CreateSessionAsync or GetSessionAsync with an explicit session id.")]
    public Task<Result<ChatSession>> GetOrCreateActiveSessionAsync(CancellationToken ct = default)
    {
        return CreateSessionAsync(ct);
    }

    public async Task<Result<ChatSession>> CreateSessionAsync(CancellationToken ct = default)
    {
        var session = new ChatSession(Guid.NewGuid(), CurrentUserId);

        return await chatSessionRepository.AddAsync(session)
            .SaveChangesAsync(unitOfWork)
            .MapAsync(() => session);
    }

    public async Task<Result<ChatSession>> GetSessionAsync(Guid sessionId, CancellationToken ct = default)
    {
        return await chatSessionRepository.GetByIdAsync(sessionId, CurrentUserId);
    }

    [Obsolete("Use DeleteSessionAsync with an explicit session id.")]
    public Task<Result> DeleteSessionAsync(CancellationToken ct = default)
    {
        return Task.FromResult(Result.NotFound(ResultErrorMessages.NotFound));
    }

    public async Task<Result> DeleteSessionAsync(Guid sessionId, CancellationToken ct = default)
    {
        return await chatSessionRepository.GetByIdAsync(sessionId, CurrentUserId)
            .ActAsync(session => chatMessageRepository.DeleteBySessionAsync(session.Id))
            .BindAsync(session => chatSessionRepository.DeleteAsync(session.Id))
            .SaveChangesAsync(unitOfWork);
    }

    [Obsolete("Use GetMessagesAsync with an explicit session id.")]
    public Task<Result<(IReadOnlyList<ChatMessage> Messages, string? NextCursor)>> GetMessagesAsync(
        string? cursor, int limit, CancellationToken ct = default)
    {
        return Task.FromResult(Result<(IReadOnlyList<ChatMessage> Messages, string? NextCursor)>.NotFound(
            ResultErrorMessages.NotFound));
    }

    public async Task<Result<(IReadOnlyList<ChatMessage> Messages, string? NextCursor)>> GetMessagesAsync(
        Guid sessionId, string? cursor, int limit, CancellationToken ct = default)
    {
        if (limit is < 1 or > 100)
            return Result.Error("The limit must be between 1 and 100.");

        return await GetSessionAsync(sessionId, ct)
            .BindAsync(session => chatMessageRepository.GetPageAsync(session.Id, cursor, limit));
    }

    public async Task<Result<IReadOnlyCollection<ChatMessage>>> GetMessagesAsync(Guid sessionId, CancellationToken ct = default)
    {
        return await GetSessionAsync(sessionId, ct)
            .BindAsync(session => chatMessageRepository.GetBySessionAsync(session.Id));
    }

    [Obsolete("Use GetMessagesAsync with an explicit session id.")]
    public Task<Result<IReadOnlyCollection<ChatMessage>>> GetMessagesAsync(CancellationToken ct = default)
    {
        return Task.FromResult(Result<IReadOnlyCollection<ChatMessage>>.NotFound(ResultErrorMessages.NotFound));
    }

    public async Task<Result<int>> GetMessageCountAsync(Guid sessionId, CancellationToken ct = default)
    {
        return await GetSessionAsync(sessionId, ct)
            .BindAsync(session => chatMessageRepository.CountBySessionAsync(session.Id));
    }

    [Obsolete("Use GetMessageCountAsync with an explicit session id.")]
    public Task<Result<int>> GetMessageCountAsync(CancellationToken ct = default)
    {
        return Task.FromResult(Result<int>.NotFound(ResultErrorMessages.NotFound));
    }

    public async Task<Result<ChatMessage>> PersistMessageAsync(ChatMessage message, CancellationToken ct = default)
    {
        return await GetSessionAsync(message.SessionId, ct)
            .Act(session => session.Touch())
            .BindAsync(_ => chatMessageRepository.AddAsync(message))
            .SaveChangesAsync(unitOfWork)
            .MapAsync(() => message);
    }

    public async Task<Result> PersistMessagesAsync(IReadOnlyCollection<ChatMessage> messages,
        CancellationToken ct = default)
    {
        if (messages.Count == 0)
            return Result.Success();

        var sessionId = messages.First().SessionId;

        return await GetSessionAsync(sessionId, ct)
            .BindAsync(session => messages.All(message => message.SessionId == session.Id)
                ? Result.Success(session)
                : Result<ChatSession>.NotFound(ResultErrorMessages.NotFound))
            .Act(session => session.Touch())
            .BindAsync(_ => chatMessageRepository.AddRangeAsync(messages))
            .SaveChangesAsync(unitOfWork);
    }

    public async Task<Result<int>> DeleteExpiredSessionsAsync(TimeSpan maxAge, CancellationToken ct = default)
    {
        var cutoff = DateTimeOffset.UtcNow - maxAge;
        return await chatSessionRepository.DeleteOlderThanAsync(cutoff, ct)
            .SaveChangesAsync(unitOfWork);
    }
}
