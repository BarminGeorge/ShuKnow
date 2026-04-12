using Microsoft.Extensions.DependencyInjection;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Services;

namespace ShuKnow.Application.Configuration;

public static class ServiceCollectionExtensions
{
    public static void AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IFolderService, FolderService>();
        services.AddScoped<IFileService, FileService>();
        services.AddScoped<IWorkspacePathService, WorkspacePathService>();
        services.AddScoped<IChatService, ChatService>();
        services.AddScoped<IAttachmentService, AttachmentService>();
        services.AddScoped<IAiToolsService, AiToolsService>();
        services.AddScoped<ISettingsService, SettingsService>();
        services.AddScoped<IActionQueryService, ActionQueryService>();
        services.AddScoped<IActionTrackingService, ActionTrackingService>();
        services.AddScoped<IRollbackService, RollbackService>();
    }
}
