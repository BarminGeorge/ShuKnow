using Microsoft.EntityFrameworkCore;
using PPshu.Domain.Entities;
using PPshu.Domain.Repositories;

namespace PPshu.Infrastructure.Persistent.Repositories;

public class UserRepository(AppDbContext context) : IUserRepository
{
    public async Task<User?> GetByIdAsync(Guid id)
    {
        return await context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id);
    }

    public void Add(User user)
    {
        context.Users.Add(user);
    }
}