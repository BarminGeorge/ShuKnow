using PPshu.Domain.Entities;

namespace PPshu.Domain.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    void Add(User user);
}