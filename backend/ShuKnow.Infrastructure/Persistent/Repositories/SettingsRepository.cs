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

    public async Task<Result> UpsertAsync(UserAiSettings settings)
    {
        var existing = await context.UserAiSettings
            .SingleOrDefaultAsync(s => s.UserId == settings.UserId);

        if (existing is not null)
            context.Entry(existing).CurrentValues.SetValues(settings);
        else
            context.UserAiSettings.Add(settings);

        return Result.Success();
    }
}