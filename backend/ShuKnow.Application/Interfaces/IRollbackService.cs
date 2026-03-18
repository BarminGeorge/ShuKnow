using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IRollbackService
{
    Task<Result<UserAction>> RollbackAsync(Guid actionId, CancellationToken ct = default);
    
    Task<Result<UserAction>> RollbackLastAsync(CancellationToken ct = default);
}
