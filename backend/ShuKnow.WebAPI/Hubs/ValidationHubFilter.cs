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
        await foreach (var error in ValidateArgumentsAsync(context))
            errors.Add(error);

        if (errors.Count <= 0)
            return await next(context);

        var validationFailedEvent = new ValidationFailedEvent(context.HubMethodName, errors);
        await context.Hub.Clients.Caller.SendAsync(nameof(ChatHub.OnValidationFailed), validationFailedEvent);
        
        throw new HubException(
            $"Validation failed for hub method '{context.HubMethodName}'. See '{nameof(ChatHub.OnValidationFailed)}' for details.");
    }

    private static async IAsyncEnumerable<ValidationError> ValidateArgumentsAsync(HubInvocationContext context)
    {
        var parameters = context.HubMethod.GetParameters();

        for (var index = 0; index < context.HubMethodArguments.Count; index++)
        {
            var argument = context.HubMethodArguments[index];
            var parameter = parameters[index];

            if (argument is null)
            {
                yield return new ValidationError(parameter.Name ?? $"arg{index}", "A value is required.");
                continue;
            }

            var validatorType = ValidatorType.MakeGenericType(argument.GetType());
            if (context.ServiceProvider.GetService(validatorType) is not IValidator validator)
                continue;

            var result = await validator.ValidateAsync(new ValidationContext<object>(argument));
            if (result.IsValid)
                continue;
            
            foreach (var error in result.Errors)
                yield return new ValidationError(error.PropertyName, error.ErrorMessage);
        }
    }
}