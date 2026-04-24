using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Errors;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class ChatSessionRepository(AppDbContext context) : IChatSessionRepository
{
    public async Task<Result<ChatSession>> GetByIdAsync(Guid sessionId, Guid userId)
    {
        var session = await context.ChatSessions
            .SingleOrDefaultAsync(session => session.Id == sessionId && session.UserId == userId);

        return session is null ? Result.NotFound(ResultErrorMessages.NotFound) : Result.Success(session);
    }

    public Task<Result> AddAsync(ChatSession session)
    {
        context.ChatSessions.Add(session);
        return Task.FromResult(Result.Success());
    }

    public Task<Result> DeleteAsync(Guid sessionId)
    {
        var trackedSessionEntry = context.ChangeTracker
            .Entries<ChatSession>()
            .SingleOrDefault(entry => entry.Entity.Id == sessionId);

        if (trackedSessionEntry is not null)
        {
            trackedSessionEntry.State = EntityState.Deleted;
            return Task.FromResult(Result.Success());
        }

        context.ChatSessions.Remove(new ChatSession(sessionId, Guid.Empty));
        return Task.FromResult(Result.Success());
    }

    public async Task<Result<int>> DeleteOlderThanAsync(DateTimeOffset cutoff, CancellationToken ct = default)
    {
        var deleted = await context.ChatSessions
            .Where(session => session.LastActivityAt < cutoff)
            .ExecuteDeleteAsync(ct);

        return Result.Success(deleted);
    }
}
