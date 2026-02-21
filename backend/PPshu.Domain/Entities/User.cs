using PPshu.Domain.Interfaces;

namespace PPshu.Domain.Entities;

public class User : IEntity<Guid>
{
    public Guid Id { get; private set; }

    protected User()
    {
    }

    public User(Guid id)
    {
        Id = id;
    }
}