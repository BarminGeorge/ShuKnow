using Amazon.Runtime;
using Amazon.S3;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
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
        var encryptionOptions = configuration.GetEncryptionOptions();
        var blobStorageOptions = configuration.GetBlobStorageOptions();
        var fileSystemOptions = configuration.GetOptionalFileSystemBlobStorageOptions();
        var s3Options = configuration.GetOptionalS3BlobStorageOptions();
        var orphanCleanupOptions = configuration.GetOrphanCleanupOptions().Validate();

        if (blobStorageOptions.UsesFileSystem)
            fileSystemOptions.Validate();
        else
            s3Options.Validate();

        services.AddDbContext<AppDbContext>((_, options) =>
        {
            var connectionString = configuration.GetConnectionString("Postgres");
            options
                .UseNpgsql(connectionString, builder => builder.EnableRetryOnFailure())
                .UseSnakeCaseNamingConvention();
        });

        services.ConfigureOptions(
            encryptionOptions, blobStorageOptions, fileSystemOptions, s3Options, orphanCleanupOptions);

        services.AddBlobStorage(blobStorageOptions, fileSystemOptions, s3Options);
        services.AddServices();
        services.AddRepositories();
        services.AddHostedService<BlobOrphanCleanupService>();
    }

    private static void ConfigureOptions(this IServiceCollection services, EncryptionOptions encryptionOptions,
        BlobStorageOptions blobStorageOptions, FileSystemBlobStorageOptions fileSystemOptions,
        S3BlobStorageOptions s3Options, OrphanCleanupOptions orphanCleanupOptions)
    {
        services.Configure<EncryptionOptions>(o => o.Key = encryptionOptions.Key);
        services.Configure<BlobStorageOptions>(o => o.Provider = blobStorageOptions.Provider);
        services.Configure<FileSystemBlobStorageOptions>(o => o.BasePath = fileSystemOptions.BasePath);
        services.Configure<S3BlobStorageOptions>(o =>
        {
            o.ServiceUrl = s3Options.ServiceUrl;
            o.AccessKey = s3Options.AccessKey;
            o.SecretKey = s3Options.SecretKey;
            o.BucketName = s3Options.BucketName;
            o.Prefix = s3Options.Prefix;
            o.ForcePathStyle = s3Options.ForcePathStyle;
        });
        services.Configure<OrphanCleanupOptions>(o =>
        {
            o.IntervalHours = orphanCleanupOptions.IntervalHours;
            o.GracePeriodMinutes = orphanCleanupOptions.GracePeriodMinutes;
        });
    }

    private static void AddServices(
        this IServiceCollection services)
    {
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IIdentityService, IdentityService>();
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IUnitOfWork, PostgresUnitOfWork>();
        services.AddScoped<IAiService, AiService>();
        services.AddSingleton<IBlobStorageService, BlobStorageService>();
        services.AddSingleton<BlobDeletionQueue>();
        services.AddSingleton<IBlobDeletionQueue>(serviceProvider =>
            serviceProvider.GetRequiredService<BlobDeletionQueue>());
        services.AddHostedService(serviceProvider =>
            serviceProvider.GetRequiredService<BlobDeletionQueue>());
        services.AddScoped<IEncryptionService, EncryptionService>();
    }

    private static void AddBlobStorage(this IServiceCollection services, BlobStorageOptions blobStorageOptions,
        FileSystemBlobStorageOptions fileSystemOptions, S3BlobStorageOptions s3Options)
    {
        services.AddSingleton<IBlobStorageProvider>(serviceProvider =>
        {
            if (blobStorageOptions.UsesFileSystem)
            {
                return new FileSystemBlobStorageProvider(
                    fileSystemOptions.BasePath,
                    serviceProvider.GetRequiredService<ILogger<FileSystemBlobStorageProvider>>());
            }

            return new S3BlobStorageProvider(
                serviceProvider.GetRequiredService<IAmazonS3>(),
                s3Options.BucketName,
                s3Options.Prefix,
                serviceProvider.GetRequiredService<ILogger<S3BlobStorageProvider>>());
        });
        if (blobStorageOptions.UsesS3)
        {
            services.AddSingleton<IAmazonS3>(_ =>
            {
                var credentials = new BasicAWSCredentials(s3Options.AccessKey, s3Options.SecretKey);
                var config = new AmazonS3Config
                {
                    ServiceURL = s3Options.ServiceUrl,
                    ForcePathStyle = s3Options.ForcePathStyle
                };

                return new AmazonS3Client(credentials, config);
            });
        }

        services.AddScoped<IBlobOrphanCleanupRunner, BlobOrphanCleanupRunner>();
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

    private static BlobStorageOptions GetBlobStorageOptions(this IConfiguration configuration)
    {
        var section = configuration.GetSection(BlobStorageOptions.SectionName);
        var options = section.Get<BlobStorageOptions>() ?? new BlobStorageOptions();
        return options.Validate();
    }

    private static FileSystemBlobStorageOptions GetOptionalFileSystemBlobStorageOptions(
        this IConfiguration configuration)
    {
        var section = configuration.GetSection(FileSystemBlobStorageOptions.SectionName);
        return section.Get<FileSystemBlobStorageOptions>() ?? new FileSystemBlobStorageOptions();
    }

    private static S3BlobStorageOptions GetOptionalS3BlobStorageOptions(this IConfiguration configuration)
    {
        var section = configuration.GetSection(S3BlobStorageOptions.SectionName);
        return section.Get<S3BlobStorageOptions>() ?? new S3BlobStorageOptions();
    }

    private static OrphanCleanupOptions GetOrphanCleanupOptions(this IConfiguration configuration)
    {
        var section = configuration.GetSection(OrphanCleanupOptions.SectionName);
        return section.Get<OrphanCleanupOptions>() ?? new OrphanCleanupOptions();
    }
}
