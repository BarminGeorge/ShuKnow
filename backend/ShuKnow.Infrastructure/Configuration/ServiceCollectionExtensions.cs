using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Repositories;
using ShuKnow.Infrastructure.Interfaces;
using ShuKnow.Infrastructure.Persistent;
using ShuKnow.Infrastructure.Persistent.Repositories;
using ShuKnow.Infrastructure.Services;

namespace ShuKnow.Infrastructure.Configuration;

public static class ServiceCollectionExtensions
{
    public static void AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>((_, options) =>
        {
            var connectionString = configuration.GetConnectionString("Postgres");
            options
                .UseNpgsql(connectionString, builder => builder.EnableRetryOnFailure())
                .UseSnakeCaseNamingConvention();
        });

        services.AddServices();
        services.AddRepositories();
    }

    private static void AddServices(this IServiceCollection services)
    {
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IIdentityService, IdentityService>();
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IAiService, AiService>();
        services.AddScoped<IBlobStorageService, BlobStorageService>();
        services.AddScoped<IEncryptionService, EncryptionService>();
    }

    private static void AddRepositories(this IServiceCollection services)
    {
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IIdentityUserRepository, IdentityUserRepository>();
        services.AddScoped<IFolderRepository, FolderRepository>();
        services.AddScoped<IFileRepository, FileRepository>();
        services.AddScoped<IChatSessionRepository, ChatSessionRepository>();
        services.AddScoped<IChatMessageRepository, ChatMessageRepository>();
        services.AddScoped<IActionRepository, ActionRepository>();
        services.AddScoped<IAttachmentRepository, AttachmentRepository>();
        services.AddScoped<ISettingsRepository, SettingsRepository>();
    }
}