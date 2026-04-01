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
    private const int CandidateBatchSize = 256;

    public async Task<int> RunCleanupAsync(CancellationToken ct)
    {
        var cutoff = DateTimeOffset.UtcNow - TimeSpan.FromMinutes(options.Value.GracePeriodMinutes);
        var candidates = new List<Guid>(CandidateBatchSize);
        var deleted = 0;

        try
        {
            await foreach (var blob in provider.StreamWithTimestampsAsync(ct))
            {
                if (blob.CreatedAt >= cutoff)
                    continue;

                candidates.Add(blob.BlobId);
                if (candidates.Count < CandidateBatchSize)
                    continue;

                var deleteBatchResult = await DeleteUnreferencedBatchAsync(candidates, ct);
                if (!deleteBatchResult.IsSuccess)
                    return deleted;

                deleted += deleteBatchResult.Value;
                candidates.Clear();
            }

            if (candidates.Count == 0)
                return deleted;

            var finalBatchResult = await DeleteUnreferencedBatchAsync(candidates, ct);
            if (!finalBatchResult.IsSuccess)
                return deleted;

            return deleted + finalBatchResult.Value;
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to stream blobs for orphan cleanup");
            return deleted;
        }
    }

    private async Task<Result<HashSet<Guid>>> GetReferencedBlobIdsAsync(
        IReadOnlyCollection<Guid> candidateBlobIds,
        CancellationToken ct)
    {
        var fileBlobIdsResult = await fileRepository.GetExistingBlobIdsAsync(candidateBlobIds, ct);
        var attachmentBlobIdsResult = await attachmentRepository.GetExistingBlobIdsAsync(candidateBlobIds, ct);

        if (!fileBlobIdsResult.IsSuccess || !attachmentBlobIdsResult.IsSuccess)
        {
            logger.LogWarning("Failed to query referenced blob IDs from database for a candidate batch");
            return Result<HashSet<Guid>>.Error("Failed to query referenced blob IDs");
        }

        var referenced = new HashSet<Guid>(fileBlobIdsResult.Value);
        referenced.UnionWith(attachmentBlobIdsResult.Value);
        return referenced;
    }

    private async Task<Result<int>> DeleteUnreferencedBatchAsync(
        IReadOnlyList<Guid> candidateBlobIds,
        CancellationToken ct)
    {
        var referencedResult = await GetReferencedBlobIdsAsync(candidateBlobIds, ct);
        if (!referencedResult.IsSuccess)
            return Result<int>.Error("Failed to query referenced blob IDs");

        var deleted = 0;
        foreach (var blobId in candidateBlobIds)
        {
            if (referencedResult.Value.Contains(blobId))
                continue;

            var deleteResult = await provider.DeleteAsync(blobId, ct);
            if (deleteResult.IsSuccess)
                deleted++;
            else
                logger.LogWarning("Failed to delete orphan blob {BlobId}", blobId);
        }

        return Result.Success(deleted);
    }
}
