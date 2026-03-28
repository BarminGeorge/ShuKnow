using ShuKnow.Domain.Entities;

namespace ShuKnow.Infrastructure.Misc;

public static class IdentityUserExtensions
{
    public static User ToUser(this IdentityUser identityUser)
    {
        return new User(id: identityUser.Id, login: identityUser.Login);
    }
}