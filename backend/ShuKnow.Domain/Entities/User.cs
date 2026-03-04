using Ardalis.Result;
using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class User : IEntity<Guid>
{
    public Guid Id { get; private set; }

    protected User()
    {
    }

    private User(Guid id)
    {
        Id = id;
    }

    public static Result<User> Create(Guid id)
    {
        return Result.Success(new User(id));
    }
}
