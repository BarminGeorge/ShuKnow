using PPshu.Domain.Entities;

namespace PPshu.Infrastructure.Misc;

public static class IdentityUserExtensions
{
    public static User ToUser(this IdentityUser identityUser)
    {
        return new User(id: identityUser.Id);
    }
}