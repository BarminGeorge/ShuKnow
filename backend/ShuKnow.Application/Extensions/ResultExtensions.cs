using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models.Notifications;

namespace ShuKnow.Application.Extensions;

public static class ResultExtensions
{
    public static string GetFirstErrorOrDefault(this IResult result, string defaultMessage)
    {
        return result.Errors.FirstOrDefault()
               ?? result.ValidationErrors.FirstOrDefault()?.ErrorMessage
               ?? defaultMessage;
    }

    public static ChatProcessingErrorCode GetChatProcessingErrorCodeOrDefault(
        this IResult result,
        ChatProcessingErrorCode defaultCode = ChatProcessingErrorCode.InternalError)
    {
        var errorCode = result.ValidationErrors.FirstOrDefault()?.ErrorCode;

        return Enum.TryParse<ChatProcessingErrorCode>(errorCode, true, out var code)
            ? code
            : defaultCode;
    }

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

    public static async Task<Result<T>> ToCreatedAsync<T>(this Task<Result<T>> resultTask)
    {
        var result = await resultTask;
        return result.Status == ResultStatus.Ok ? Result.Created(result.Value) : result;
    }

    public static async Task<Result> BindAsync<TSource>(
        this Task<Result<TSource>> resultTask, Func<TSource, Result> bindFunc)
    {
        return await resultTask.BindAsync(source => Task.FromResult(bindFunc(source)));
    }
    public static async Task<Result<TDestination>> Map<TSource, TDestination>(
        this Task<Result<TSource>> result, Func<TSource, TDestination> mapFunc)
    {
        return (await result).Map(mapFunc);
    }

    public static async Task<Result<TSource>> ActAsync<TSource>(
        this Result<TSource> result, Func<TSource, Task<Result>> actFunc)
    {
        return await result.BindAsync(source => actFunc(source).MapAsync(() => source));
    }
    
    public static async Task<Result<TSource>> ActAsync<TSource, TDestination>(
        this Result<TSource> result, Func<TSource, Task<Result<TDestination>>> actFunc)
    {
        return await result.BindAsync(source => actFunc(source).MapAsync(_ => source));
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

    public static Result Invalid(string errorMessage, ChatProcessingErrorCode chatErrorCode)
    {
        return Result.Invalid(CreateChatError(errorMessage, chatErrorCode));
    }
    
    public static Result<T> Invalid<T>(string errorMessage, ChatProcessingErrorCode chatErrorCode)
    {
        return Result<T>.Invalid(CreateChatError(errorMessage, chatErrorCode));
    }

    private static ValidationError CreateChatError(string errorMessage, ChatProcessingErrorCode chatErrorCode)
    {
        return new ValidationError("id", errorMessage, chatErrorCode.ToString(), ValidationSeverity.Error);
    }
    
    public static async Task<Result<T>> Tap<T>(this Task<Result<T>> resultTask, Func<T, Task> asyncAction)
    {
        var result = await resultTask;

        if (result.IsSuccess)
            await asyncAction(result.Value);

        return result;
    }
    
    public static async Task<Result<T>> TapAsync<T>(
        this Task<Result<T>> resultTask,
        Func<T, Task> asyncAction)
    {
        var result = await resultTask;
        if (result.IsSuccess)
            await asyncAction(result.Value);
        return result;
    }

    public static async Task<Result<T>> TapAsync<T>(
        this Result<T> result,
        Func<T, Task> asyncAction)
    {
        if (result.IsSuccess)
            await asyncAction(result.Value);
        return result;
    }
}
