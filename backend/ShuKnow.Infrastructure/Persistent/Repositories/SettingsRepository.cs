using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class SettingsRepository(AppDbContext context) : ISettingsRepository
{
    public async Task<Result<UserAiSettings>> GetByUserAsync(Guid userId)
    {
        var settings = await context.UserAiSettings
            .AsNoTracking()
            .SingleOrDefaultAsync(s => s.UserId == userId);

        return settings is null ? Result.NotFound() : Result.Success(settings);
    }

    public async Task<Result<UserAiSettings>> UpsertAsync(UserAiSettings settings)
    {
        var exists = await context.UserAiSettings.AnyAsync(s => s.UserId == settings.UserId);

        if (exists)
            context.UserAiSettings.Update(settings);
        else
            context.UserAiSettings.Add(settings);

        return Result.Success(settings);
    }
}