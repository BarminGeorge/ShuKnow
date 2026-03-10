using FluentValidation;
using Microsoft.AspNetCore.SignalR;
using ShuKnow.WebAPI.Events;

namespace ShuKnow.WebAPI.Hubs;

public class ValidationHubFilter : IHubFilter
{
    private static readonly Type ValidatorType = typeof(IValidator<>);
    
    public async ValueTask<object?> InvokeMethodAsync(HubInvocationContext context,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        var errors = new List<ValidationError>();

        foreach (var arg in context.HubMethodArguments)
        {
            if (arg is null)
                continue;

            var validatorType = ValidatorType.MakeGenericType(arg.GetType());
            if (context.ServiceProvider.GetService(validatorType) is not IValidator validator)
                continue;

            var result = await validator.ValidateAsync(new ValidationContext<object>(arg));
            if (!result.IsValid)
                errors.AddRange(result.Errors.Select(e => new ValidationError(e.PropertyName, e.ErrorMessage)));
        }

        if (errors.Count <= 0) 
            return await next(context);
        
        await context.Hub.Clients.Caller.SendAsync(
            nameof(ChatHub.OnValidationFailed), 
            new ValidationFailedEvent(context.HubMethodName, errors));
        
        return null;
    }
}