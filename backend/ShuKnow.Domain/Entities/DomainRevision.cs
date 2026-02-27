using Ardalis.Result;
using ShuKnow.Domain.Abstractions;
using ShuKnow.Domain.Common;

namespace ShuKnow.Domain.Entities;

public class DomainRevision : Entity<Guid>, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public Guid SessionId { get; private set; }
    public Guid? PreviousRevisionId { get; private set; }
    public string RequestFingerprint { get; private set; } = string.Empty;
    public string SnapshotReference { get; private set; } = string.Empty;
    public DateTimeOffset CreatedAtUtc { get; private set; }

    protected DomainRevision()
    {
    }

    private DomainRevision(
        Guid id,
        Guid userId,
        Guid sessionId,
        Guid? previousRevisionId,
        string requestFingerprint,
        string snapshotReference,
        DateTimeOffset createdAtUtc) : base(id)
    {
        UserId = userId;
        SessionId = sessionId;
        PreviousRevisionId = previousRevisionId;
        RequestFingerprint = requestFingerprint;
        SnapshotReference = snapshotReference;
        CreatedAtUtc = createdAtUtc;
    }

    public static Result<DomainRevision> Create(
        Guid id,
        Guid userId,
        Guid sessionId,
        string requestFingerprint,
        string snapshotReference,
        Guid? previousRevisionId = null,
        DateTimeOffset? createdAtUtc = null)
    {
        if (id == Guid.Empty)
            return DomainResult.Invalid<DomainRevision>(nameof(id), "Revision id cannot be empty.");

        if (userId == Guid.Empty)
            return DomainResult.Invalid<DomainRevision>(nameof(userId), "Revision user id cannot be empty.");

        if (sessionId == Guid.Empty)
            return DomainResult.Invalid<DomainRevision>(nameof(sessionId), "Revision session id cannot be empty.");

        if (previousRevisionId == id)
            return DomainResult.Invalid<DomainRevision>(
                nameof(previousRevisionId),
                "Previous revision id cannot reference the same revision.");

        var normalizedFingerprint = requestFingerprint?.Trim() ?? string.Empty;
        if (normalizedFingerprint.Length == 0)
            return DomainResult.Invalid<DomainRevision>(
                nameof(requestFingerprint),
                "Request fingerprint is required.");

        if (normalizedFingerprint.Length > DomainConstraints.FingerprintMaxLength)
            return DomainResult.Invalid<DomainRevision>(
                nameof(requestFingerprint),
                $"Request fingerprint cannot exceed {DomainConstraints.FingerprintMaxLength} characters.");

        var normalizedSnapshotReference = snapshotReference?.Trim() ?? string.Empty;
        if (normalizedSnapshotReference.Length == 0)
            return DomainResult.Invalid<DomainRevision>(
                nameof(snapshotReference),
                "Snapshot reference is required.");

        if (normalizedSnapshotReference.Length > DomainConstraints.SnapshotReferenceMaxLength)
            return DomainResult.Invalid<DomainRevision>(
                nameof(snapshotReference),
                $"Snapshot reference cannot exceed {DomainConstraints.SnapshotReferenceMaxLength} characters.");

        return Result.Success(
            new DomainRevision(
                id,
                userId,
                sessionId,
                previousRevisionId,
                normalizedFingerprint,
                normalizedSnapshotReference,
                createdAtUtc ?? DateTimeOffset.UtcNow));
    }

    public Result EnsureOwnedBy(Guid userId)
    {
        if (userId == Guid.Empty)
            return DomainResult.Invalid(nameof(userId), "User id cannot be empty.");

        return userId == UserId
            ? Result.Success()
            : Result.Forbidden("Revision does not belong to the requested user.");
    }
}
