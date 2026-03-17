using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using ShuKnow.Infrastructure.Interfaces;
using ShuKnow.Infrastructure.Misc;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class IdentityUserRepository(AppDbContext context) : IIdentityUserRepository
{
    public async Task<Result<IdentityUser>> GetByLoginAsync(string login)
    {
        var user = await context.IdentityUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Login == login);

        return user is null ? Result.Unauthorized("Invalid login or password.") : Result.Success(user);
    }

    public async Task<Result<bool>> ContainsLoginAsync(string login)
    {
        return await context.IdentityUsers.AnyAsync(user => user.Login == login);
    }

    public Task<Result> AddAsync(IdentityUser user)
    {
        context.IdentityUsers.Add(user);
        return Task.FromResult(Result.Success());
    }
}