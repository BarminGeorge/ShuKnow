using Ardalis.Result;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class ChatSessionRepository : IChatSessionRepository
{
    public Task<Result<ChatSession>> GetActiveAsync(Guid userId)
    {
        throw new NotImplementedException();
    }

    public Task<Result> AddAsync(ChatSession session)
    {
        throw new NotImplementedException();
    }

    public Task<Result> DeleteAsync(Guid sessionId)
    {
        throw new NotImplementedException();
    }
}