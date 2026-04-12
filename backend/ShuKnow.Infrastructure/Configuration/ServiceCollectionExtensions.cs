using System.ComponentModel.DataAnnotations;
using Amazon.Runtime;
using Amazon.S3;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
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
        services.AddInfrastructureOptions();
        services.AddPostgres(configuration);
        services.AddBlobStorage(configuration);
        services.AddServices();
        services.AddRepositories();
        services.AddHostedService<BlobOrphanCleanupService>();
    }

    private static void AddPostgres(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>((_, options) =>
        {
            var connectionString = configuration.GetConnectionString("Postgres");
            options
                .UseNpgsql(connectionString, builder => builder.EnableRetryOnFailure())
                .UseSnakeCaseNamingConvention();
        });
    }

    private static void AddServices(
        this IServiceCollection services)
    {
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IIdentityService, IdentityService>();
        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IUnitOfWork, PostgresUnitOfWork>();
        services.AddSingleton<IBlobStorageService, BlobStorageService>();
        services.AddSingleton<BlobDeletionQueue>();
        services.AddSingleton<IBlobDeletionQueue>(static serviceProvider =>
            serviceProvider.GetRequiredService<BlobDeletionQueue>());
        services.AddSingleton<IHostedService>(static serviceProvider =>
            serviceProvider.GetRequiredService<BlobDeletionQueue>());
        services.AddScoped<IEncryptionService, EncryptionService>();
        services.AddScoped<IAiService, TornadoAiService>();
        services.AddScoped<TornadoPromptBuilder>();
        services.AddScoped<TornadoToolsService>();
        services.AddScoped<ITornadoConversationFactory, TornadoConversationFactory>();
    }

    private static void AddBlobStorage(this IServiceCollection services, IConfiguration configuration)
    {
        var blobOptions = configuration.GetSection(BlobStorageOptions.SectionName).Get<BlobStorageOptions>()
            ?? throw new InvalidOperationException($"{BlobStorageOptions.SectionName} section is not configured.");

        if (blobOptions.UsesFileSystem)
            services.AddFileSystemBlobStorage();
        else if (blobOptions.UsesS3)
            services.AddS3BlobStorage();
        else
            throw new InvalidOperationException(
                $"{BlobStorageOptions.SectionName}:Provider must be '{BlobStorageOptions.FileSystemProvider}' or '{BlobStorageOptions.S3Provider}'.");

        services.AddScoped<IBlobOrphanCleanupRunner, BlobOrphanCleanupRunner>();
    }

    private static void AddFileSystemBlobStorage(this IServiceCollection services)
    {
        services.AddSingleton<IBlobStorageProvider>(serviceProvider =>
        {
            var options = serviceProvider.GetRequiredService<IOptions<FileSystemBlobStorageOptions>>().Value;

            return new FileSystemBlobStorageProvider(
                options.BasePath,
                serviceProvider.GetRequiredService<ILogger<FileSystemBlobStorageProvider>>());
        });
    }

    private static void AddS3BlobStorage(this IServiceCollection services)
    {
        services.AddSingleton<IAmazonS3>(serviceProvider =>
        {
            var options = serviceProvider.GetRequiredService<IOptions<S3BlobStorageOptions>>().Value;
            var credentials = new BasicAWSCredentials(options.AccessKey, options.SecretKey);
            var config = new AmazonS3Config
            {
                ServiceURL = options.ServiceUrl,
                ForcePathStyle = options.ForcePathStyle
            };

            return new AmazonS3Client(credentials, config);
        });

        services.AddSingleton<IBlobStorageProvider>(serviceProvider =>
        {
            var options = serviceProvider.GetRequiredService<IOptions<S3BlobStorageOptions>>().Value;

            return new S3BlobStorageProvider(
                serviceProvider.GetRequiredService<IAmazonS3>(),
                options.BucketName,
                options.Prefix,
                serviceProvider.GetRequiredService<ILogger<S3BlobStorageProvider>>());
        });

        services.AddHostedService<S3BucketInitializationService>();
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
    
    private static void AddInfrastructureOptions(this IServiceCollection services)
    {
        services.AddSingleton<IValidateOptions<FileSystemBlobStorageOptions>, FileSystemBlobStorageOptionsValidation>();
        services.AddSingleton<IValidateOptions<S3BlobStorageOptions>, S3BlobStorageOptionsValidation>();

        services.AddOptions<EncryptionOptions>()
            .BindConfiguration(EncryptionOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<TornadoAiOptions>()
            .BindConfiguration(TornadoAiOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<BlobStorageOptions>()
            .BindConfiguration(BlobStorageOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<FileSystemBlobStorageOptions>()
            .BindConfiguration(FileSystemBlobStorageOptions.SectionName)
            .ValidateOnStart();

        services.AddOptions<S3BlobStorageOptions>()
            .BindConfiguration(S3BlobStorageOptions.SectionName)
            .ValidateOnStart();

        services.AddOptions<OrphanCleanupOptions>()
            .BindConfiguration(OrphanCleanupOptions.SectionName)
            .Validate(
                options => options.GracePeriodMinutes <= options.IntervalHours * 60,
                $"{OrphanCleanupOptions.SectionName}:GracePeriodMinutes must be less than or equal to IntervalHours * 60")
            .ValidateDataAnnotations()
            .ValidateOnStart();
    }

    private sealed class FileSystemBlobStorageOptionsValidation(IOptions<BlobStorageOptions> blobStorageOptions)
        : IValidateOptions<FileSystemBlobStorageOptions>
    {
        public ValidateOptionsResult Validate(string? name, FileSystemBlobStorageOptions options)
        {
            return !blobStorageOptions.Value.UsesFileSystem
                ? ValidateOptionsResult.Skip
                : ValidateDataAnnotations(options);
        }
    }

    private sealed class S3BlobStorageOptionsValidation(IOptions<BlobStorageOptions> blobStorageOptions)
        : IValidateOptions<S3BlobStorageOptions>
    {
        public ValidateOptionsResult Validate(string? name, S3BlobStorageOptions options)
        {
            return !blobStorageOptions.Value.UsesS3
                ? ValidateOptionsResult.Skip
                : ValidateDataAnnotations(options);
        }
    }

    private static ValidateOptionsResult ValidateDataAnnotations<TOptions>(TOptions options)
        where TOptions : class
    {
        var validationResults = new List<ValidationResult>();
        var validationContext = new ValidationContext(options);

        if (Validator.TryValidateObject(options, validationContext, validationResults, true))
            return ValidateOptionsResult.Success;

        var errors = validationResults
            .Select(validationResult => validationResult.ErrorMessage)
            .Where(error => !string.IsNullOrWhiteSpace(error))
            .Cast<string>()
            .ToArray();

        return ValidateOptionsResult.Fail(errors);
    }
}
