using System.Threading.Channels;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ShuKnow.Application.Interfaces;

namespace ShuKnow.Infrastructure.Services;

public sealed class BlobDeletionQueue(
    IBlobStorageService blobStorageService,
    ILogger<BlobDeletionQueue> logger) : BackgroundService, IBlobDeletionQueue
{
    private readonly Channel<Guid> queue = Channel.CreateBounded<Guid>(new BoundedChannelOptions(256)
    {
        FullMode = BoundedChannelFullMode.Wait,
        SingleReader = true,
        SingleWriter = false
    });

    public ValueTask EnqueueDeleteAsync(Guid blobId)
        => queue.Writer.WriteAsync(blobId);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var blobId in queue.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                var result = await blobStorageService.DeleteAsync(blobId, stoppingToken);
                if (result.IsSuccess) 
                    continue;
                
                logger.LogWarning(
                    "Best-effort blob cleanup failed for {BlobId}: {Errors}",
                    blobId,
                    string.Join(", ", result.Errors));
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Best-effort blob cleanup failed for {BlobId}", blobId);
            }
        }
    }
}
