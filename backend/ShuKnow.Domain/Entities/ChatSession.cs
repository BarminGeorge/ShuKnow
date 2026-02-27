using Ardalis.Result;
using ShuKnow.Domain.Abstractions;
using ShuKnow.Domain.Common;

namespace ShuKnow.Domain.Entities;

public class ChatSession : Entity<Guid>, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public bool IsActive { get; private set; }
    public DateTimeOffset StartedAtUtc { get; private set; }
    public DateTimeOffset? ClosedAtUtc { get; private set; }

    protected ChatSession()
    {
    }

    private ChatSession(
        Guid id,
        Guid userId,
        DateTimeOffset startedAtUtc,
        bool isActive,
        DateTimeOffset? closedAtUtc) : base(id)
    {
        UserId = userId;
        StartedAtUtc = startedAtUtc;
        IsActive = isActive;
        ClosedAtUtc = closedAtUtc;
    }

    public static Result<ChatSession> Create(
        Guid id,
        Guid userId,
        DateTimeOffset? startedAtUtc = null,
        bool isActive = true)
    {
        if (id == Guid.Empty)
            return DomainResult.Invalid<ChatSession>(nameof(id), "Session id cannot be empty.");

        if (userId == Guid.Empty)
            return DomainResult.Invalid<ChatSession>(nameof(userId), "Session user id cannot be empty.");

        var startedAt = startedAtUtc ?? DateTimeOffset.UtcNow;
        DateTimeOffset? closedAt = isActive ? null : startedAt;

        return Result.Success(new ChatSession(id, userId, startedAt, isActive, closedAt));
    }

    public Result Activate()
    {
        if (IsActive)
            return Result.Conflict("Session is already active.");

        IsActive = true;
        ClosedAtUtc = null;
        return Result.Success();
    }

    public Result Close(DateTimeOffset? closedAtUtc = null)
    {
        if (!IsActive)
            return Result.Conflict("Session is already closed.");

        var closedAt = closedAtUtc ?? DateTimeOffset.UtcNow;
        if (closedAt < StartedAtUtc)
            return DomainResult.Invalid(nameof(closedAtUtc), "Session close time cannot be before start time.");

        IsActive = false;
        ClosedAtUtc = closedAt;
        return Result.Success();
    }

    public Result EnsureActive()
    {
        return IsActive
            ? Result.Success()
            : Result.Conflict("Session is not active.");
    }

    public Result EnsureOwnedBy(Guid userId)
    {
        if (userId == Guid.Empty)
            return DomainResult.Invalid(nameof(userId), "User id cannot be empty.");

        return userId == UserId
            ? Result.Success()
            : Result.Forbidden("Session does not belong to the requested user.");
    }
}
