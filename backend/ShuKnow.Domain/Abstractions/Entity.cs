using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Abstractions;

public abstract class Entity<TId> : IEntity<TId> where TId : notnull
{
    public TId Id { get; protected set; } = default!;

    protected Entity()
    {
    }

    protected Entity(TId id)
    {
        Id = id;
    }
}
