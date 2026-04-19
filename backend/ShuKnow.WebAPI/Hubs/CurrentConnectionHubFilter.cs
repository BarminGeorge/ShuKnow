using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using ShuKnow.Application.Interfaces;
using ShuKnow.WebAPI.Services;

namespace ShuKnow.WebAPI.Hubs;

public class CurrentConnectionHubFilter : IHubFilter
{
    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext context,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        SetConnectionId(context.ServiceProvider, context.Context.ConnectionId);
        return await next(context);
    }

    public async Task OnConnectedAsync(
        HubLifetimeContext context,
        Func<HubLifetimeContext, Task> next)
    {
        SetConnectionId(context.ServiceProvider, context.Context.ConnectionId);
        await next(context);
    }

    public async Task OnDisconnectedAsync(
        HubLifetimeContext context,
        Exception? exception,
        Func<HubLifetimeContext, Exception?, Task> next)
    {
        SetConnectionId(context.ServiceProvider, context.Context.ConnectionId);
        await next(context, exception);
    }

    private static void SetConnectionId(IServiceProvider serviceProvider, string connectionId)
    {
        if (serviceProvider.GetService<ICurrentConnectionService>() is CurrentConnectionService currentConnectionService)
            currentConnectionService.SetConnectionId(connectionId);
    }
}
