using Ardalis.Result;
using ShuKnow.Application.Interfaces;

namespace ShuKnow.Application.Extensions;

public static class ResultExtensions
{
    public static async Task<Result<T>> SaveChangesAsync<T>(this Task<Result<T>> result, IUnitOfWork unitOfWork)
    {
        return await result.BindAsync(arg => unitOfWork.SaveChangesAsync().MapAsync(() => arg));
    }

    public static async Task<Result> SaveChangesAsync(this Task<Result> result, IUnitOfWork unitOfWork)
    {
        return await result.BindAsync(_ => unitOfWork.SaveChangesAsync());
    }

    public static async Task<Result<TSource>> ActAsync<TSource, TDestination>(
        this Task<Result<TSource>> result, Func<TSource, Task<Result<TDestination>>> actFunc)
    {
        return await result.BindAsync(source => actFunc(source).MapAsync(_ => source));
    }

    public static async Task<Result<TSource>> ActAsync<TSource>(
        this Task<Result<TSource>> result, Func<TSource, Task<Result>> actFunc)
    {
        return await result.BindAsync(source => actFunc(source).MapAsync(() => source));
    }

    public static async Task<Result<TSource>> ActAsync<TSource>(
        this Task<Result<TSource>> result, Func<TSource, Task> actFunc)
    {
        return await result.MapAsync(async source =>
        {
            await actFunc(source);
            return source;
        });
    }
    
    public static async Task<Result<TSource>> ActAsync<TSource>(
        this Task<Result<TSource>> result, Action<TSource> actFunc)
    {
        return await result.MapAsync(source =>
        {
            actFunc(source);
            return Task.FromResult(source);
        });
    }

    public static Result<T> ToTypedResult<T>(this Result result)
    {
        return result.Status switch
        {
            ResultStatus.Unauthorized => Result<T>.Unauthorized(),
            ResultStatus.NotFound => Result<T>.NotFound(),
            ResultStatus.Conflict => Result<T>.Conflict(),
            _ => Result<T>.Error()
        };
    }

    public static Result<TDestination> ToTypedResult<TSource, TDestination>(this Result<TSource> result)
    {
        return result.Status switch
        {
            ResultStatus.Unauthorized => Result<TDestination>.Unauthorized(),
            ResultStatus.NotFound => Result<TDestination>.NotFound(),
            ResultStatus.Conflict => Result<TDestination>.Conflict(),
            _ => Result<TDestination>.Error()
        };
    }
}