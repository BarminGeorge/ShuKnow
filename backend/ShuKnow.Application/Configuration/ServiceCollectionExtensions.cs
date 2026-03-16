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
        services.AddScoped<IChatService, ChatService>();
        services.AddScoped<IAttachmentService, AttachmentService>();
        services.AddScoped<ISettingsService, SettingsService>();
        services.AddScoped<IAiOrchestrationService, AiOrchestrationService>();
        services.AddScoped<IActionQueryService, ActionQueryService>();
        services.AddScoped<IActionTrackingService, ActionTrackingService>();
        services.AddScoped<IRollbackService, RollbackService>();
        services.AddScoped<IPromptBuilder, PromptBuilder>();
        services.AddScoped<IPromptPreparationService, PromptPreparationService>();
        services.AddScoped<IClassificationParser, ClassificationParser>();
    }
}