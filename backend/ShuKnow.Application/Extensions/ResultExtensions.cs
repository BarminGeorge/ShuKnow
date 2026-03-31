using Ardalis.Result;
using ShuKnow.Application.Interfaces;

namespace ShuKnow.Application.Extensions;

public static class ResultExtensions
{
    public static async Task<Result<T>> SaveChangesAsync<T>(this Task<Result<T>> result, IUnitOfWork unitOfWork)
    {
        return await result.ActAsync(_ => unitOfWork.SaveChangesAsync());
    }

    public static async Task<Result> SaveChangesAsync(this Task<Result> result, IUnitOfWork unitOfWork)
    {
        return await result.BindAsync(_ => unitOfWork.SaveChangesAsync());
    }
    
    public static async Task<Result<T>> SaveChangesAsync<T>(this Result<T> result, IUnitOfWork unitOfWork)
    {
        return await result.ActAsync(_ => unitOfWork.SaveChangesAsync());
    }

    public static async Task<Result> BindAsync<TSource>(
        this Task<Result<TSource>> resultTask, Func<TSource, Result> bindFunc)
    {
        return await resultTask.BindAsync(source => Task.FromResult(bindFunc(source)));
    }
    
    public static async Task<Result<TSource>> ActAsync<TSource>(
        this Result<TSource> result, Func<TSource, Task<Result>> actFunc)
    {
        return await result.BindAsync(source => actFunc(source).MapAsync(() => source));
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

    public static async Task<Result<TSource>> Act<TSource>(
        this Task<Result<TSource>> result, Func<TSource, Result> actFunc)
    {
        return await result.BindAsync(source => actFunc(source).Map(() => source));
    }

    
    public static async Task<Result<TSource>> Act<TSource>(this Task<Result<TSource>> result, Action<TSource> actFunc)
    {
        return await result.MapAsync(source =>
        {
            actFunc(source);
            return Task.FromResult(source);
        });
    }
    
    public static Result<TSource> Act<TSource>(this Result<TSource> result, Action<TSource> actFunc)
    {
        return result.Map(source =>
        {
            actFunc(source);
            return source;
        });
    }

    public static Result<TSource> Act<TSource>(this Result<TSource> result, Func<TSource, Result> actFunc)
    {
        return result.Bind(source => actFunc(source).Map(() => source));
    }

    public static Result<TSource> Act<TSource, TDestination>(
        this Result<TSource> result, Func<TSource, Result<TDestination>> actFunc)
    {
        return result.Bind(source => actFunc(source).Map(_ => source));
    }

    public static async Task<Result<TSource>> Act<TSource, TDestination>(
        this Task<Result<TSource>> result, Func<TSource, Result<TDestination>> actFunc)
    {
        return await result.BindAsync(source => actFunc(source).Map(_ => source));
    }
}