using Ardalis.Result;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class SettingsRepository : ISettingsRepository
{
    public Task<Result<UserAiSettings>> GetByUserAsync(Guid userId)
    {
        throw new NotImplementedException();
    }

    public Task<Result> UpsertAsync(UserAiSettings settings)
    {
        throw new NotImplementedException();
    }
}