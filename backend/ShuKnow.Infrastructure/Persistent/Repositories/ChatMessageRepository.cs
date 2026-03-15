using Ardalis.Result;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class ChatMessageRepository : IChatMessageRepository
{
    public Task<Result> AddAsync(ChatMessage message)
    {
        throw new NotImplementedException();
    }

    public Task<Result<(IReadOnlyList<ChatMessage> Messages, string? NextCursor)>> GetPageAsync(
        Guid sessionId,
        string? cursor,
        int limit)
    {
        throw new NotImplementedException();
    }

    public Task<Result> DeleteBySessionAsync(Guid sessionId)
    {
        throw new NotImplementedException();
    }
}
