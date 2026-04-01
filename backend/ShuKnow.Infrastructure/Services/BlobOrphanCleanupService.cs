using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ShuKnow.Application.Common;
using ShuKnow.Infrastructure.Interfaces;

namespace ShuKnow.Infrastructure.Services;

public class BlobOrphanCleanupService(
    IServiceScopeFactory scopeFactory,
    IOptions<OrphanCleanupOptions> options,
    ILogger<BlobOrphanCleanupService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromHours(options.Value.IntervalHours);
        logger.LogInformation(
            "Blob orphan cleanup started. Interval: {Interval}, GracePeriod: {GracePeriod}m",
            interval, options.Value.GracePeriodMinutes);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var deleted = await RunCleanupAsync(stoppingToken);
                if (deleted > 0)
                    logger.LogInformation("Orphan cleanup deleted {Count} blob(s)", deleted);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Orphan cleanup cycle failed");
            }

            await Task.Delay(interval, stoppingToken);
        }
    }

    internal async Task<int> RunCleanupAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var runner = scope.ServiceProvider.GetRequiredService<IBlobOrphanCleanupRunner>();
        return await runner.RunCleanupAsync(ct);
    }
}
