using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Application.Services;

internal class ActionQueryService(
    IActionRepository actionRepository,
    ICurrentUserService currentUser) 
    : IActionQueryService
{
    public Task<Result<(IReadOnlyList<UserAction> Actions, int TotalCount)>> ListAsync(
        int page, int pageSize, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<(UserAction Action, IReadOnlyList<ActionItem> Items)>> GetByIdAsync(
        Guid actionId, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}