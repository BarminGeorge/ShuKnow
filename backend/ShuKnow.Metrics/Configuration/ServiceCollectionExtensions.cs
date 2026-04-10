using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;

namespace ShuKnow.Metrics.Configuration;

public static class ServiceCollectionExtensions
{
    public static void AddMetrics(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOpenTelemetryMetrics();
    }
    
    public static IServiceCollection AddOpenTelemetryMetrics(this IServiceCollection services)
    {
        services.AddOpenTelemetry()
            .ConfigureResource(resource => resource
                .AddService(serviceName: "ShuKnow.WebAPI", serviceVersion: "1.0.0"))
            .WithMetrics(metrics => metrics
                .AddAspNetCoreInstrumentation()
                .AddRuntimeInstrumentation()
                .AddPrometheusExporter());
                
        return services;
    }
}