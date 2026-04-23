using System.Globalization;
using System.Text;
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

    public Task<Result> AddRangeAsync(IReadOnlyCollection<ChatMessage> messages)
    {
        context.ChatMessages.AddRange(messages);
        return Task.FromResult(Result.Success());
    }

    public async Task<Result<IReadOnlyCollection<ChatMessage>>> GetBySessionAsync(Guid sessionId)
    {
        return await GetOrderedSessionMessagesQuery(sessionId).ToListAsync();
    }

    public async Task<Result<(IReadOnlyList<ChatMessage> Messages, string? NextCursor)>> GetPageAsync(
        Guid sessionId,
        string? cursor,
        int limit)
    {
        var query = GetOrderedSessionMessagesQuery(sessionId);

        if (!string.IsNullOrWhiteSpace(cursor))
        {
            if (!TryParseCursor(cursor, sessionId, out var cursorData))
                return Result.Invalid(new ValidationError("Invalid or tampered cursor provided."));

            query = query.Where(m =>
                m.CreatedAt > cursorData.CreatedAt ||
                (m.CreatedAt == cursorData.CreatedAt && m.Id.CompareTo(cursorData.Id) > 0));
        }

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

    public async Task<Result<int>> CountBySessionAsync(Guid sessionId)
    {
        var count = await context.ChatMessages.CountAsync(message => message.SessionId == sessionId);
        return Result.Success(count);
    }

    private IQueryable<ChatMessage> GetOrderedSessionMessagesQuery(Guid sessionId) =>
        context.ChatMessages
            .AsNoTracking()
            .Where(m => m.SessionId == sessionId)
            .OrderBy(m => m.CreatedAt)
            .ThenBy(m => m.Id);

    private static bool TryParseCursor(string encodedCursor, Guid expectedSessionId, out CursorData cursorData)
    {
        cursorData = default;

        Span<byte> buffer = new byte[encodedCursor.Length];
        if (!Convert.TryFromBase64String(encodedCursor, buffer, out var bytesWritten))
            return false;

        var str = Encoding.UTF8.GetString(buffer[..bytesWritten]);
        var parts = str.Split('|');
        if (parts.Length != 3) return false;

        if (!Guid.TryParse(parts[0], out var sessionId) || sessionId != expectedSessionId) return false;
        if (!DateTimeOffset.TryParse(parts[1], null, DateTimeStyles.RoundtripKind, out var createdAt))
            return false;

        if (!Guid.TryParse(parts[2], out var id)) return false;

        cursorData = new CursorData(createdAt, id);
        return true;
    }

    private static string EncodeCursor(ChatMessage message)
    {
        var str = $"{message.SessionId:N}|{message.CreatedAt:O}|{message.Id:N}";
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(str));
    }

    private static (IReadOnlyList<ChatMessage> Messages, string? NextCursor) CreatePageResult(List<ChatMessage> messages, int limit) =>
        messages.Count > limit
            ? (messages.GetRange(0, limit).AsReadOnly(), EncodeCursor(messages[limit - 1]))
            : (messages.AsReadOnly(), null);

    private readonly record struct CursorData(DateTimeOffset CreatedAt, Guid Id);
}
