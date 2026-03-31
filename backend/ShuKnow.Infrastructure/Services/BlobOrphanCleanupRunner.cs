using Ardalis.Result;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ShuKnow.Application.Common;
using ShuKnow.Domain.Repositories;
using ShuKnow.Infrastructure.Interfaces;

namespace ShuKnow.Infrastructure.Services;

public class BlobOrphanCleanupRunner(
    IBlobStorageProvider provider,
    IFileRepository fileRepository,
    IAttachmentRepository attachmentRepository,
    IOptions<OrphanCleanupOptions> options,
    ILogger<BlobOrphanCleanupRunner> logger) : IBlobOrphanCleanupRunner
{
    public async Task<int> RunCleanupAsync(CancellationToken ct)
    {
        var blobsResult = await provider.ListWithTimestampsAsync(ct);
        if (!blobsResult.IsSuccess)
        {
            logger.LogWarning("Failed to list blobs: {Errors}", string.Join("; ", blobsResult.Errors));
            return 0;
        }

        if (blobsResult.Value.Count == 0)
            return 0;

        var referencedResult = await GetReferencedBlobIdsAsync();
        if (!referencedResult.IsSuccess)
            return 0;

        var cutoff = DateTimeOffset.UtcNow - TimeSpan.FromMinutes(options.Value.GracePeriodMinutes);
        var orphans = FindOrphans(blobsResult.Value, referencedResult.Value, cutoff);

        return await DeleteOrphansAsync(orphans, ct);
    }

    private async Task<Result<HashSet<Guid>>> GetReferencedBlobIdsAsync()
    {
        var fileBlobIdsResult = await fileRepository.GetAllBlobIdsAsync();
        var attachmentBlobIdsResult = await attachmentRepository.GetAllBlobIdsAsync();

        if (!fileBlobIdsResult.IsSuccess || !attachmentBlobIdsResult.IsSuccess)
        {
            logger.LogWarning("Failed to query referenced blob IDs from database");
            return Result<HashSet<Guid>>.Error("Failed to query referenced blob IDs");
        }

        var referenced = new HashSet<Guid>(fileBlobIdsResult.Value);
        referenced.UnionWith(attachmentBlobIdsResult.Value);
        return referenced;
    }

    private static List<Guid> FindOrphans(
        IReadOnlyList<(Guid BlobId, DateTimeOffset CreatedAt)> blobs,
        HashSet<Guid> referencedBlobIds,
        DateTimeOffset cutoff)
    {
        return blobs
            .Where(b => b.CreatedAt < cutoff && !referencedBlobIds.Contains(b.BlobId))
            .Select(b => b.BlobId)
            .ToList();
    }

    private async Task<int> DeleteOrphansAsync(List<Guid> orphans, CancellationToken ct)
    {
        var deleted = 0;
        foreach (var orphanId in orphans)
        {
            var deleteResult = await provider.DeleteAsync(orphanId, ct);
            if (deleteResult.IsSuccess)
                deleted++;
            else
                logger.LogWarning("Failed to delete orphan blob {BlobId}", orphanId);
        }

        return deleted;
    }
}
