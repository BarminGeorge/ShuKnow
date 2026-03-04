using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Infrastructure.Misc;

public static class IdentityUserExtensions
{
    public static Result<User> ToUser(this IdentityUser identityUser)
    {
        return User.Create(identityUser.Id);
    }
}
