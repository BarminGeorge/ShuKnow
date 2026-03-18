using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Repositories;

public interface ISettingsRepository
{
    Task<Result<UserAiSettings>> GetByUserAsync(Guid userId);

    Task<Result> UpsertAsync(UserAiSettings settings);
}