using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Npgsql;
using ShuKnow.Application.Interfaces;
using ShuKnow.Infrastructure.Persistent;

namespace ShuKnow.Infrastructure.Services;

public class PostgresUnitOfWork(AppDbContext context, ILogger<PostgresUnitOfWork> logger) : IUnitOfWork
{
    public async Task<Result> SaveChangesAsync()
    {
        try
        {
            await context.SaveChangesAsync();
            return Result.Success();
        }
        catch (DbUpdateConcurrencyException ex)
        {
            logger.LogWarning(ex, "Concurrency conflict during SaveChanges");
            return Result.Conflict("The record was modified by another request. Please retry.");
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg)
        {
            logger.LogWarning(ex, 
                "Database constraint violation: {SqlState}, constraint: {ConstraintName}, schema: {Schema}, " +
                "Table: {Table}, Column: {Column}, at: {Where}",
                pg.SqlState, pg.ConstraintName, pg.SchemaName, pg.TableName, pg.ColumnName, pg.Where);
            
            switch (pg.SqlState)
            {
                case PostgresErrorCodes.UniqueViolation:
                    return Result.Conflict("A data conflict occurred. Please retry.");
                case PostgresErrorCodes.ForeignKeyViolation:
                    return Result.Error("A database error occurred: foreign key constraint violation.");
                default:
                    throw;
            }
        }
    }
}