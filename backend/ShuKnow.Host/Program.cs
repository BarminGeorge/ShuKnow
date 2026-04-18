using dotenv.net;
using ShuKnow.Application.Configuration;
using ShuKnow.Domain.Configuration;
using ShuKnow.Infrastructure.Configuration;
using ShuKnow.Metrics.Configuration;
using ShuKnow.WebAPI.Configuration;

namespace ShuKnow.Host;

public static class Program
{
    private const string ApplyMigrationsOnlyEnvironmentVariable = "SHUKNOW_APPLY_MIGRATIONS_ONLY";

    public static async Task Main(string[] args)
    {
        DotEnv.Load(new DotEnvOptions(probeForEnv: true, probeLevelsToSearch: 5));

        var builder = WebApplication.CreateBuilder(args);
        builder.Services.ConfigureServices(builder.Configuration);

        var app = builder.Build();

        if (ShouldApplyMigrationsOnly())
        {
            app.Services.ApplyMigrations();
            return;
        }

        app.ConfigureApp();

        await app.RunAsync();
    }

    private static void ConfigureServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDomain();
        services.AddInfrastructure(configuration);
        services.AddApplication();
        services.AddMetrics(configuration);
        services.AddWeb(configuration);
    }

    private static void ConfigureApp(this WebApplication app)
    {
        app.UseWeb();

        if (app.Environment.IsDevelopment())
            app.ConfigureAppDevelopment();
    }

    private static void ConfigureAppDevelopment(this WebApplication app)
    {
        app.UseWebDevelopment();
        app.Services.ApplyMigrations();
    }
    
    private static bool ShouldApplyMigrationsOnly()
        => string.Equals(
            Environment.GetEnvironmentVariable(ApplyMigrationsOnlyEnvironmentVariable),
            bool.TrueString,
            StringComparison.OrdinalIgnoreCase);
}
