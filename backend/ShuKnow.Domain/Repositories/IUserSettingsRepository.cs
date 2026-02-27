using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Repositories;

public interface IUserSettingsRepository
{
    Task<Result<UserSettings>> GetByUserIdAsync(Guid userId);
    void Add(UserSettings settings);
}
