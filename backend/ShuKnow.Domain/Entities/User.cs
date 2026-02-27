using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class User : IEntity<Guid>
{
    public Guid Id { get; private set; }

    protected User()
    {
    }

    public User(Guid id)
    {
        if (id == Guid.Empty)
        {
            throw new ArgumentException("User id cannot be empty.", nameof(id));
        }

        Id = id;
    }
}
