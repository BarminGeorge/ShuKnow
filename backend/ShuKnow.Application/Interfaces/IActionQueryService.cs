using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IActionQueryService
{
    Task<Result<(IReadOnlyList<UserAction> Actions, int TotalCount)>> ListAsync(
        int page,
        int pageSize,
        CancellationToken ct = default);
    
    Task<Result<(UserAction Action, IReadOnlyList<ActionItem> Items)>> GetByIdAsync(
        Guid actionId,
        CancellationToken ct = default);
}
