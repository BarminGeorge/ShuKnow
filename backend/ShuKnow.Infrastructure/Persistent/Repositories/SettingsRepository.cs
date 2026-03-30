using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class SettingsRepository(AppDbContext context) : ISettingsRepository
{
    public async Task<Result<UserAiSettings>> GetByUserAsync(Guid userId)
    {
        return await GetByUserAsync(userId, noTracking: true);
    }

    public Task<Result<UserAiSettings>> GetByUserForUpdateAsync(Guid userId)
    {
        return GetByUserAsync(userId, noTracking: false);
    }

    public async Task<Result> UpsertAsync(UserAiSettings settings)
    {
        var exists = await context.UserAiSettings.AnyAsync(s => s.UserId == settings.UserId);

        if (exists)
            context.UserAiSettings.Update(settings);
        else
            context.UserAiSettings.Add(settings);

        return Result.Success();
    }

    private async Task<Result<UserAiSettings>> GetByUserAsync(Guid userId, bool noTracking)
    {
        var query = noTracking ? context.UserAiSettings.AsNoTracking() : context.UserAiSettings;
        var settings = await query.SingleOrDefaultAsync(s => s.UserId == userId);

        return settings is null ? Result.NotFound() : Result.Success(settings);
    }
}