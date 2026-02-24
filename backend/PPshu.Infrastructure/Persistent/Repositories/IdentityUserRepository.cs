using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using PPshu.Infrastructure.Interfaces;
using PPshu.Infrastructure.Misc;

namespace PPshu.Infrastructure.Persistent.Repositories;

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

    public void Add(IdentityUser user)
    {
        context.IdentityUsers.Add(user);
    }
}