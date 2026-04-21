using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Enums;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class ChatSessionRepository(AppDbContext context) : IChatSessionRepository
{
    public async Task<Result<ChatSession>> GetActiveAsync(Guid userId)
    {
        var session = await context.ChatSessions
            .AsNoTracking()
            .Include(session => session.Messages.OrderBy(message => message.Index).ThenBy(message => message.Id))
            .SingleOrDefaultAsync(session => session.UserId == userId && session.Status == ChatSessionStatus.Active);

        return session is null ? Result.NotFound() : Result.Success(session);
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

        context.ChatSessions.Remove(new ChatSession(sessionId, Guid.Empty, ChatSessionStatus.Closed));
        return Task.FromResult(Result.Success());
    }
}
