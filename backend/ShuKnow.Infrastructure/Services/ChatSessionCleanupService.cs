using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ShuKnow.Application.Common;
using ShuKnow.Application.Interfaces;

namespace ShuKnow.Infrastructure.Services;

public class ChatSessionCleanupService(
    IServiceScopeFactory scopeFactory,
    IOptions<ChatSessionCleanupOptions> options,
    ILogger<ChatSessionCleanupService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromMinutes(options.Value.IntervalMinutes);
        logger.LogInformation(
            "Chat session cleanup started. Interval: {Interval}, MaxAge: {MaxAge}m",
            interval, options.Value.MaxAgeMinutes);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var deleted = await RunCleanupAsync(stoppingToken);
                if (deleted > 0)
                    logger.LogInformation("Chat session cleanup deleted {Count} session(s)", deleted);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Chat session cleanup cycle failed");
            }

            await Task.Delay(interval, stoppingToken);
        }
    }

    internal async Task<int> RunCleanupAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var chatService = scope.ServiceProvider.GetRequiredService<IChatService>();
        var result = await chatService.DeleteExpiredSessionsAsync(
            TimeSpan.FromMinutes(options.Value.MaxAgeMinutes),
            ct);

        return result.IsSuccess ? result.Value : 0;
    }
}
