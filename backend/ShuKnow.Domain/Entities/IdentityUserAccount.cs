using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class IdentityUserAccount : IEntity<Guid>
{
    public Guid Id { get; private set; }
    public string Login { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;

    protected IdentityUserAccount()
    {
    }

    public IdentityUserAccount(Guid id, string login, string passwordHash)
    {
        Id = id;
        Login = login;
        PasswordHash = passwordHash;
    }
}
