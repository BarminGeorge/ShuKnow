using PPshu.Domain.Entities;
using PPshu.Domain.Repositories;

namespace PPshu.Infrastructure.Persistent.Repositories;

public class UserRepository(AppDbContext context) : IUserRepository
{
    public async Task<User?> GetByIdAsync(Guid id)
    {
        return await context.Users.FindAsync(id);
    }

    public async Task AddAsync(User user)
    {
        await context.Users.AddAsync(user);
    }
}