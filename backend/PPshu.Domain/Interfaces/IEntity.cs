namespace PPshu.Domain.Interfaces;

public interface IEntity<out TId>
{
    TId Id { get; }
}