using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ShuKnow.Application.Common;
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
        
        services.Configure<EncryptionOptions>(o => o.Key = configuration.GetEncryptionOptions().Key);
        services.Configure<OrphanCleanupOptions>(o =>
        {
            var cleanup = configuration.GetOrphanCleanupOptions();
            o.IntervalHours = cleanup.IntervalHours;
            o.GracePeriodMinutes = cleanup.GracePeriodMinutes;
        });

        services.AddServices();
        services.AddRepositories();
        services.AddHostedService<BlobOrphanCleanupService>();
    }

    private static void AddServices(this IServiceCollection services)
    {
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IIdentityService, IdentityService>();
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IUnitOfWork, PostgresUnitOfWork>();
        services.AddScoped<IAiService, AiService>();
        services.AddScoped<IBlobStorageService, BlobStorageService>();
        services.AddScoped<IBlobOrphanCleanupRunner, BlobOrphanCleanupRunner>();
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
    
    private static EncryptionOptions GetEncryptionOptions(this IConfiguration configuration)
    {
        var section = configuration.GetSection(EncryptionOptions.SectionName);
        var options = section.Get<EncryptionOptions>() ?? new EncryptionOptions();
        return options.Validate();
    }

    private static OrphanCleanupOptions GetOrphanCleanupOptions(this IConfiguration configuration)
    {
        var section = configuration.GetSection(OrphanCleanupOptions.SectionName);
        return section.Get<OrphanCleanupOptions>() ?? new OrphanCleanupOptions();
    }
}
