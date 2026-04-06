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
        var query = GetBaseQuery(sessionId);

        if (!string.IsNullOrWhiteSpace(cursor))
        {
            if (!TryParseCursor(cursor, sessionId, out var cursorData))
                return Result.Invalid(new ValidationError("Invalid or tampered cursor provided."));

            if (cursorData.Index.HasValue)
            {
                query = query.Where(m =>
                    m.Index > cursorData.Index ||
                    m.Index == null ||
                    (m.Index == cursorData.Index && m.Id.CompareTo(cursorData.Id) > 0));
            }
            else
            {
                query = query.Where(m =>
                    m.Index == null && m.Id.CompareTo(cursorData.Id) > 0);
            }
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

    private IQueryable<ChatMessage> GetBaseQuery(Guid sessionId) =>
        context.ChatMessages
            .AsNoTracking()
            .Where(m => m.SessionId == sessionId)
            .OrderBy(m => m.Index)
            .ThenBy(m => m.Id);

    private static bool TryParseCursor(string encodedCursor, Guid expectedSessionId, out CursorData cursorData)
    {
        cursorData = default;

        Span<byte> buffer = new byte[encodedCursor.Length];
        if (!Convert.TryFromBase64String(encodedCursor, buffer, out var bytesWritten))
            return false;

        var str = System.Text.Encoding.UTF8.GetString(buffer[..bytesWritten]);
        var parts = str.Split('|');
        if (parts.Length != 3) return false;

        if (!Guid.TryParse(parts[0], out var sessionId) || sessionId != expectedSessionId) return false;

        int? index = null;
        if (!string.IsNullOrEmpty(parts[1]))
        {
            if (!int.TryParse(parts[1], out var parsedIndex)) return false;
            index = parsedIndex;
        }

        if (!Guid.TryParse(parts[2], out var id)) return false;

        cursorData = new CursorData(index, id);
        return true;
    }

    private static string EncodeCursor(ChatMessage message)
    {
        var str = $"{message.SessionId:N}|{message.Index}|{message.Id:N}";
        return Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(str));
    }

    private static (IReadOnlyList<ChatMessage> Messages, string? NextCursor) CreatePageResult(List<ChatMessage> messages, int limit) =>
        messages.Count > limit
            ? (messages.GetRange(0, limit).AsReadOnly(), EncodeCursor(messages[limit - 1]))
            : (messages.AsReadOnly(), null);

    private readonly record struct CursorData(int? Index, Guid Id);
}
