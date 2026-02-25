using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ShuKnow.Infrastructure.Interfaces;
using ShuKnow.Infrastructure.Persistent;

namespace ShuKnow.Infrastructure.Services;

public class UnitOfWork(AppDbContext context) : IUnitOfWork
{
    public async Task<Result> SaveChangesAsync()
    {
        try
        {
            await context.SaveChangesAsync();
            return Result.Success();
        }
        catch (DbUpdateException e)
        {
            if (e.InnerException is not PostgresException postgresException)
                throw;

            switch (postgresException.SqlState)
            {
                case PostgresErrorCodes.UniqueViolation:
                    return Result.Conflict("A conflict occurred: unique constraint violation.");
                case PostgresErrorCodes.ForeignKeyViolation:
                    return Result.Error("A database error occurred: foreign key constraint violation.");
                default:
                    throw;
            }
        }
    }
}