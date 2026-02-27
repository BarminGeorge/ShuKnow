using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Repositories;

public interface IDomainRevisionRepository
{
    Task<Result<DomainRevision>> GetByIdAsync(Guid id);
    Task<Result<IReadOnlyList<DomainRevision>>> GetBySessionIdAsync(Guid userId, Guid sessionId);
    void Add(DomainRevision revision);
}
