using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Services;

public class ChatSessionLifecycleService : IChatSessionLifecycleService
{
    public Result<ChatSession> StartNewSession(
        Guid userId,
        IReadOnlyCollection<ChatSession> existingSessions,
        DateTimeOffset? startedAtUtc = null)
    {
        if (userId == Guid.Empty)
            return Result<ChatSession>.Error("User id cannot be empty.");

        if (existingSessions is null)
            return Result<ChatSession>.Error("Session collection is required.");

        var hasActiveSession = existingSessions.Any(session => session.UserId == userId && session.IsActive);
        if (hasActiveSession)
            return Result<ChatSession>.Conflict("User already has an active chat session.");

        return ChatSession.Create(Guid.NewGuid(), userId, startedAtUtc, isActive: true);
    }

    public Result EnsureCanPostMessage(ChatSession session)
    {
        if (session is null)
            return Result.Error("Session is required.");

        return session.EnsureActive();
    }

    public Result CloseSession(ChatSession session, DateTimeOffset? closedAtUtc = null)
    {
        if (session is null)
            return Result.Error("Session is required.");

        return session.Close(closedAtUtc);
    }
}
