using Ardalis.Result;
using ShuKnow.Application.Interfaces;

namespace ShuKnow.Application.Extensions;

public static class ResultExtensions
{
    public static async Task<Result<T>> SaveChangesAsync<T>(this Task<Result<T>> result, IUnitOfWork unitOfWork)
    {
        return await result.BindAsync(arg => unitOfWork.SaveChangesAsync().MapAsync(() => arg));
    }
    
    public static async Task<Result<T>> SaveChangesAsync<T>(this Result<T> result, IUnitOfWork unitOfWork)
    {
        return await result.BindAsync(arg => unitOfWork.SaveChangesAsync().MapAsync(() => arg));
    }
    
    public static async Task<Result> SaveChangesAsync(this Task<Result> result, IUnitOfWork unitOfWork)
    {
        return await result.BindAsync(_ => unitOfWork.SaveChangesAsync());
    }
    
    public static async Task<Result> SaveChangesAsync(this Result result, IUnitOfWork unitOfWork)
    {
        return await result.BindAsync(_ => unitOfWork.SaveChangesAsync());
    }
}