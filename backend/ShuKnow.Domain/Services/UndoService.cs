using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Services;

public class UndoService : IUndoService
{
    public Result<DomainRevision> ResolveRollbackTarget(
        Guid userId,
        Guid targetRevisionId,
        IReadOnlyCollection<DomainRevision> revisions)
    {
        if (userId == Guid.Empty)
            return Result<DomainRevision>.Error("User id cannot be empty.");

        if (targetRevisionId == Guid.Empty)
            return Result<DomainRevision>.Error("Target revision id cannot be empty.");

        if (revisions is null)
            return Result<DomainRevision>.Error("Revision collection is required.");

        var revision = revisions.FirstOrDefault(item => item.Id == targetRevisionId);
        if (revision is null)
            return Result<DomainRevision>.NotFound($"Revision '{targetRevisionId}' was not found.");

        if (revision.UserId != userId)
            return Result<DomainRevision>.Forbidden("Cannot rollback to a revision owned by another user.");

        return Result<DomainRevision>.Success(revision);
    }
}
