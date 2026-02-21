using PPshu.Domain.Interfaces;

namespace PPshu.Domain.Entities;

public class User(Guid id) : IEntity<Guid>
{
    public Guid Id { get; private set; } = id;
}