namespace PPshu.Domain.Interfaces;

internal interface IEntity<out TId>
{
    TId Id { get; }
}