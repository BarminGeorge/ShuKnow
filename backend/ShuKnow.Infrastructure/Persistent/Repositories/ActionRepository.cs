using Ardalis.Result;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class ActionRepository : IActionRepository
{
    public Task<Result<UserAction>> GetByIdWithItemsAsync(Guid actionId, Guid userId)
    {
        throw new NotImplementedException();
    }

    public Task<Result<(IReadOnlyList<UserAction> Actions, int TotalCount)>> ListAsync(
        Guid userId, int page, int pageSize)
    {
        throw new NotImplementedException();
    }

    public Task<Result<UserAction>> GetLastEligibleAsync(Guid userId)
    {
        throw new NotImplementedException();
    }

    public Task<Result> AddAsync(UserAction action)
    {
        throw new NotImplementedException();
    }

    public Task<Result> AddItemAsync(Guid actionId, ActionItem item)
    {
        throw new NotImplementedException();
    }

    public Task<Result> MarkRolledBackAsync(Guid actionId)
    {
        throw new NotImplementedException();
    }
}