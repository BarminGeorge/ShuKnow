using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Services;

public interface IUndoService
{
    Result<DomainRevision> ResolveRollbackTarget(
        Guid userId,
        Guid targetRevisionId,
        IReadOnlyCollection<DomainRevision> revisions);
}
