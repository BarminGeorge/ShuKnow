using Ardalis.Result;
using ShuKnow.Infrastructure.Misc;

namespace ShuKnow.Infrastructure.Interfaces;

public interface IIdentityUserRepository
{
    Task<Result<IdentityUser>> GetByLoginAsync(string login);
    
    Task<Result<bool>> ContainsLoginAsync(string login);
    
    Task AddAsync(IdentityUser user);
}