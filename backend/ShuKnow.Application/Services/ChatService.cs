using Ardalis.Result;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
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

    public async Task<Result<ChatSession>> GetOrCreateActiveSessionAsync(CancellationToken ct = default)
    {
        var activeSessionResult = await chatSessionRepository.GetActiveAsync(CurrentUserId);
        if (!activeSessionResult.IsNotFound())
            return activeSessionResult;

        var session = new ChatSession(Guid.NewGuid(), CurrentUserId);

        return await chatSessionRepository.AddAsync(session)
            .SaveChangesAsync(unitOfWork)
            .MapAsync(() => session);
    }

    public async Task<Result> DeleteSessionAsync(CancellationToken ct = default)
    {
        return await chatSessionRepository.GetActiveAsync(CurrentUserId)
            .ActAsync(session => chatMessageRepository.DeleteBySessionAsync(session.Id))
            .BindAsync(session => chatSessionRepository.DeleteAsync(session.Id))
            .SaveChangesAsync(unitOfWork);
    }

    public async Task<Result<(IReadOnlyList<ChatMessage> Messages, string? NextCursor)>> GetMessagesAsync(
        string? cursor, int limit, CancellationToken ct = default)
    {
        if (limit is < 1 or > 100)
            return Result.Error("The limit must be between 1 and 100.");

        return await GetOrCreateActiveSessionAsync(ct)
            .BindAsync(session => chatMessageRepository.GetPageAsync(session.Id, cursor, limit));
    }
    
    public async Task<Result<IReadOnlyCollection<ChatMessage>>> GetMessagesAsync(CancellationToken ct = default)
    {
        return await GetOrCreateActiveSessionAsync(ct)
            .MapAsync(session => session.Messages);
    }

    public async Task<Result<ChatMessage>> PersistMessageAsync(ChatMessage message, CancellationToken ct = default)
    {
        return await chatSessionRepository.GetActiveAsync(CurrentUserId)
            .BindAsync(session => Task.FromResult(
                session.Id == message.SessionId
                    ? Result.Success(session)
                    : Result<ChatSession>.NotFound()))
            .BindAsync(_ => chatMessageRepository.AddAsync(message))
            .SaveChangesAsync(unitOfWork)
            .MapAsync(() => message);
    }
}
