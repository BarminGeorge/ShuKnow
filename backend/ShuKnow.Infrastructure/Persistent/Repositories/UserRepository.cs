using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Errors;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Infrastructure.Persistent.Repositories;

public class UserRepository(AppDbContext context) : IUserRepository
{
    public async Task<Result<User>> GetByIdAsync(Guid userId)
    {
        var user = await context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        return user is null ? Result.NotFound(ResultErrorMessages.NotFound) : Result.Success(user);
    }

    public Task<Result> AddAsync(User user)
    {
        context.Users.Add(user);
        return Task.FromResult(Result.Success());
    }
}
