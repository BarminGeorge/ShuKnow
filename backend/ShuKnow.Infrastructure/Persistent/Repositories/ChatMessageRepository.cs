using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class ChatMessageRepository(AppDbContext context) : IChatMessageRepository
{
    public Task<Result> AddAsync(ChatMessage message)
    {
        context.ChatMessages.Add(message);
        return Task.FromResult(Result.Success());
    }

    public async Task<Result<(IReadOnlyList<ChatMessage> Messages, string? NextCursor)>> GetPageAsync(
        Guid sessionId,
        string? cursor,
        int limit)
    {
        var query = await ApplyCursorFilterAsync(GetBaseQuery(sessionId), cursor);
        var messages = await query.Take(limit + 1).ToListAsync();

        return Result.Success(CreatePageResult(messages, limit));
    }

    public async Task<Result> DeleteBySessionAsync(Guid sessionId)
    {
        await context.ChatMessages
            .Where(m => m.SessionId == sessionId)
            .ExecuteDeleteAsync();

        return Result.Success();
    }

    private IQueryable<ChatMessage> GetBaseQuery(Guid sessionId) =>
        context.ChatMessages
            .AsNoTracking()
            .Where(m => m.SessionId == sessionId)
            .OrderBy(m => m.Index)
            .ThenBy(m => m.Id);

    private async Task<IQueryable<ChatMessage>> ApplyCursorFilterAsync(IQueryable<ChatMessage> query, string? cursor) =>
        Guid.TryParse(cursor, out var cursorId) && await GetCursorDataAsync(cursorId) is { } cursorData
            ? query.Where(m => m.Index > cursorData.Index || (m.Index == cursorData.Index && m.Id.CompareTo(cursorData.Id) > 0))
            : query;

    private async Task<CursorData?> GetCursorDataAsync(Guid cursorId) =>
        await context.ChatMessages
            .AsNoTracking()
            .Where(m => m.Id == cursorId)
            .Select(m => new CursorData(m.Index, m.Id))
            .FirstOrDefaultAsync();

    private static (IReadOnlyList<ChatMessage> Messages, string? NextCursor) CreatePageResult(List<ChatMessage> messages, int limit) =>
        messages.Count > limit
            ? (messages.GetRange(0, limit).AsReadOnly(), messages[limit - 1].Id.ToString())
            : (messages.AsReadOnly(), null);

    private record CursorData(int? Index, Guid Id);
}
