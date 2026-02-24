using Ardalis.Result;
using PPshu.Domain.Entities;

namespace PPshu.Domain.Repositories;

public interface IUserRepository
{
    Task<Result<User>> GetByIdAsync(Guid id);
    void Add(User user);
}