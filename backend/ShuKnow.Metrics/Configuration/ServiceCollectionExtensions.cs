using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using ShuKnow.Metrics.Instruments;
using ShuKnow.Metrics.Repositories;
using ShuKnow.Metrics.Services;
using StackExchange.Redis;

namespace ShuKnow.Metrics.Configuration;

public static class ServiceCollectionExtensions
{
    public static void AddMetrics(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<MetricsOptions>(configuration.GetSection(MetricsOptions.SectionName));

        services.AddSingleton<IConnectionMultiplexer>(_ =>
        {
            var connectionString = configuration.GetConnectionString("Redis") ?? "localhost:6379";
            return ConnectionMultiplexer.Connect(connectionString);
        });

        services.AddSingleton<MetricsInstruments>();
        services.AddSingleton<IMetricsRepository, RedisMetricsRepository>();
        services.AddSingleton<IMetricsService, MetricsService>();

        services.AddOpenTelemetryMetrics();
    }

    private static void AddOpenTelemetryMetrics(this IServiceCollection services)
    {
        services.AddOpenTelemetry()
            .ConfigureResource(resource => resource
                .AddService(serviceName: "ShuKnow.WebAPI", serviceVersion: "1.0.0"))
            .WithMetrics(metrics => metrics
                .AddMeter(MetricsInstruments.MeterName)
                .AddAspNetCoreInstrumentation()
                .AddRuntimeInstrumentation()
                .AddPrometheusExporter());
    }
}
