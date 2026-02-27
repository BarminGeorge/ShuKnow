using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Services;

public interface IChatSessionLifecycleService
{
    Result<ChatSession> StartNewSession(
        Guid userId,
        IReadOnlyCollection<ChatSession> existingSessions,
        DateTimeOffset? startedAtUtc = null);

    Result EnsureCanPostMessage(ChatSession session);

    Result CloseSession(ChatSession session, DateTimeOffset? closedAtUtc = null);
}
