using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class User : IEntity<Guid>
{
    public Guid Id { get; private set; }
    public string Login { get; private set; } = string.Empty;

    protected User()
    {
    }

    public User(Guid id, string login)
    {
        Id = id;
        Login = login;
    }
}
