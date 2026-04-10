using dotenv.net;
using ShuKnow.Application.Configuration;
using ShuKnow.Domain.Configuration;
using ShuKnow.Infrastructure.Configuration;
using ShuKnow.WebAPI.Configuration;
using ShuKnow.Metrics.Configuration;

namespace ShuKnow.Host;

public static class Program
{
    public static async Task Main(string[] args)
    {
        DotEnv.Load(new DotEnvOptions(probeForEnv: true, probeLevelsToSearch: 5));

        var builder = WebApplication.CreateBuilder(args);
        builder.Services.ConfigureServices(builder.Configuration);

        var app = builder.Build();
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
}