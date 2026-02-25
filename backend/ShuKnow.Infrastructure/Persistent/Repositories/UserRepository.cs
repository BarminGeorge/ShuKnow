using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class UserRepository(AppDbContext context) : IUserRepository
{
    public async Task<Result<User>> GetByIdAsync(Guid id)
    {
        var user = await context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id);

        return user is null ? Result.NotFound() : Result.Success(user);
    }

    public void Add(User user)
    {
        context.Users.Add(user);
    }
}