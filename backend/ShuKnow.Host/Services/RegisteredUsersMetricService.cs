using Microsoft.EntityFrameworkCore;
using ShuKnow.Infrastructure.Persistent;
using ShuKnow.Metrics.Instruments;

namespace ShuKnow.Host.Services;

public class RegisteredUsersMetricService(
    IServiceScopeFactory scopeFactory,
    MetricsInstruments instruments,
    ILogger<RegisteredUsersMetricService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await RefreshMetricAsync(stoppingToken);
            await Task.Delay(Interval, stoppingToken);
        }
    }

    internal async Task RefreshMetricAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var usersCount = await context.Users.CountAsync(cancellationToken);

            instruments.SetRegisteredUsersCount(usersCount);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Failed to refresh registered users metric");
        }
    }
}
