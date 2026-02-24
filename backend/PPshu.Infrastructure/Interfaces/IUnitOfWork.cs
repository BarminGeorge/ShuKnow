using Ardalis.Result;

namespace PPshu.Infrastructure.Interfaces;

public interface IUnitOfWork
{
    Task<Result> SaveChangesAsync();
}