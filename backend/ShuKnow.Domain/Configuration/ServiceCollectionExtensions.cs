using Microsoft.Extensions.DependencyInjection;
using ShuKnow.Domain.Services;

namespace ShuKnow.Domain.Configuration;

public static class ServiceCollectionExtensions
{
    public static void AddDomain(this IServiceCollection services)
    {
        services.AddScoped<IWorkspaceStructureService, WorkspaceStructureService>();
        services.AddScoped<IChatSessionLifecycleService, ChatSessionLifecycleService>();
        services.AddScoped<IUndoService, UndoService>();
    }
}
