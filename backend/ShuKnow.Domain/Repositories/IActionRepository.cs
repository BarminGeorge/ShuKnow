using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Repositories;

public interface IActionRepository
{
    Task<Result<UserAction>> GetByIdWithItemsAsync(Guid actionId, Guid userId);

    Task<Result<(IReadOnlyList<UserAction> Actions, int TotalCount)>> ListAsync(Guid userId, int page, int pageSize);

    Task<Result<UserAction>> GetLastEligibleAsync(Guid userId);

    Task<Result> AddAsync(UserAction action);

    Task<Result> AddItemAsync(Guid actionId, ActionItem item);

    Task<Result> MarkRolledBackAsync(Guid actionId);
}