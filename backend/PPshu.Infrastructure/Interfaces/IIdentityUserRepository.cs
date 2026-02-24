using Ardalis.Result;
using PPshu.Infrastructure.Misc;

namespace PPshu.Infrastructure.Interfaces;

public interface IIdentityUserRepository
{
    Task<Result<IdentityUser>> GetByLoginAsync(string login);
    Task<Result<bool>> ContainsLoginAsync(string login);
    void Add(IdentityUser user);
}