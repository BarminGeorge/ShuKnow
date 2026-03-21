using Ardalis.Result;

namespace ShuKnow.Application.Interfaces;

public interface IUnitOfWork
{
    Task<Result> SaveChangesAsync();
}