using Ardalis.Result;
using ShuKnow.Domain.Abstractions;
using ShuKnow.Domain.Common;

namespace ShuKnow.Domain.Entities;

public class User : Entity<Guid>, IAggregateRoot
{
    protected User()
    {
    }

    public User(Guid id) : base(id)
    {
    }

    public static Result<User> Create(Guid id)
    {
        if (id == Guid.Empty)
            return DomainResult.Invalid<User>(nameof(id), "User id cannot be empty.");

        return Result.Success(new User(id));
    }
}
