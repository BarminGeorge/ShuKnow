using Ardalis.Result;

namespace ShuKnow.Infrastructure.Interfaces;

public interface IUnitOfWork
{
    Task<Result> SaveChangesAsync();
}