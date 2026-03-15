using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Repositories;

public interface IUserRepository
{
    Task<Result<User>> GetByIdAsync(Guid userId);

    Task AddAsync(User user);
}