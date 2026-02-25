namespace ShuKnow.Infrastructure.Misc;

public class IdentityUser
{
    public Guid Id { get; private set; }
    public string Login { get; private set; }
    public string PasswordHash { get; private set; }

    protected IdentityUser()
    {
    }

    public IdentityUser(string login, string passwordHash)
    {
        Id = Guid.NewGuid();
        Login = login;
        PasswordHash = passwordHash;
    }
}