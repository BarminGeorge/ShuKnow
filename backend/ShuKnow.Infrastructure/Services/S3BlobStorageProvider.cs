using System.Net;
using Amazon.S3;
using Amazon.S3.Model;
using Ardalis.Result;
using Microsoft.Extensions.Logging;
using ShuKnow.Infrastructure.Interfaces;

namespace ShuKnow.Infrastructure.Services;

public class S3BlobStorageProvider(
    IAmazonS3 s3Client,
    string bucketName,
    string prefix,
    ILogger<S3BlobStorageProvider> logger) : IBlobStorageProvider
{
    public async Task<Result> SaveAsync(Stream content, Guid blobId, CancellationToken ct = default)
    {
        try
        {
            var request = new PutObjectRequest
            {
                BucketName = bucketName,
                Key = GetObjectKey(blobId),
                InputStream = content,
                AutoCloseStream = false
            };

            await s3Client.PutObjectAsync(request, ct);
            return Result.Success();
        }
        catch (AmazonS3Exception ex)
        {
            logger.LogError(ex, "Failed to save blob {BlobId} to S3", blobId);
            return Result.Error($"Failed to save blob to S3: {ex.Message}");
        }
    }

    public async Task<Result<Stream>> GetAsync(Guid blobId, CancellationToken ct = default)
    {
        try
        {
            var request = new GetObjectRequest
            {
                BucketName = bucketName,
                Key = GetObjectKey(blobId)
            };

            var response = await s3Client.GetObjectAsync(request, ct);
            return Result.Success(response.ResponseStream);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return Result<Stream>.NotFound($"Blob {blobId} not found.");
        }
        catch (AmazonS3Exception ex)
        {
            logger.LogError(ex, "Failed to get blob {BlobId} from S3", blobId);
            return Result<Stream>.Error($"Failed to get blob from S3: {ex.Message}");
        }
    }

    public async Task<Result<Stream>> GetRangeAsync(
        Guid blobId, long rangeStart, long rangeEnd, CancellationToken ct = default)
    {
        try
        {
            var request = new GetObjectRequest
            {
                BucketName = bucketName,
                Key = GetObjectKey(blobId),
                ByteRange = new ByteRange(rangeStart, rangeEnd - 1)
            };

            var response = await s3Client.GetObjectAsync(request, ct);
            return Result.Success(response.ResponseStream);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return Result<Stream>.NotFound($"Blob {blobId} not found.");
        }
        catch (AmazonS3Exception ex) when (
            ex.StatusCode == HttpStatusCode.RequestedRangeNotSatisfiable)
        {
            return Result<Stream>.Invalid(
                new ValidationError($"Invalid byte range {rangeStart}-{rangeEnd} for blob {blobId}."));
        }
        catch (AmazonS3Exception ex)
        {
            logger.LogError(ex, "Failed to get range of blob {BlobId} from S3", blobId);
            return Result<Stream>.Error($"Failed to get blob range from S3: {ex.Message}");
        }
    }

    public async Task<Result> DeleteAsync(Guid blobId, CancellationToken ct = default)
    {
        try
        {
            var request = new DeleteObjectRequest
            {
                BucketName = bucketName,
                Key = GetObjectKey(blobId)
            };

            await s3Client.DeleteObjectAsync(request, ct);
            return Result.Success();
        }
        catch (AmazonS3Exception ex)
        {
            logger.LogError(ex, "Failed to delete blob {BlobId} from S3", blobId);
            return Result.Error($"Failed to delete blob from S3: {ex.Message}");
        }
    }

    public async Task<Result<long>> GetSizeAsync(Guid blobId, CancellationToken ct = default)
    {
        try
        {
            var request = new GetObjectMetadataRequest
            {
                BucketName = bucketName,
                Key = GetObjectKey(blobId)
            };

            var response = await s3Client.GetObjectMetadataAsync(request, ct);
            return Result.Success(response.ContentLength);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return Result<long>.NotFound($"Blob {blobId} not found.");
        }
        catch (AmazonS3Exception ex)
        {
            logger.LogError(ex, "Failed to get size of blob {BlobId} from S3", blobId);
            return Result<long>.Error($"Failed to get blob size from S3: {ex.Message}");
        }
    }

    public async Task<Result<bool>> ExistsAsync(Guid blobId, CancellationToken ct = default)
    {
        try
        {
            var request = new GetObjectMetadataRequest
            {
                BucketName = bucketName,
                Key = GetObjectKey(blobId)
            };

            await s3Client.GetObjectMetadataAsync(request, ct);
            return Result.Success(true);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return Result.Success(false);
        }
        catch (AmazonS3Exception ex)
        {
            logger.LogError(ex, "Failed to check existence of blob {BlobId} in S3", blobId);
            return Result<bool>.Error($"Failed to check blob existence in S3: {ex.Message}");
        }
    }

    public async Task<Result<IReadOnlyList<Guid>>> ListAsync(CancellationToken ct = default)
    {
        try
        {
            var blobs = new List<Guid>();
            var request = new ListObjectsV2Request
            {
                BucketName = bucketName,
                Prefix = string.IsNullOrEmpty(prefix) ? null : prefix + "/"
            };

            while (true)
            {
                var response = await s3Client.ListObjectsV2Async(request, ct);

                foreach (var obj in response.S3Objects ?? [])
                {
                    var key = obj.Key;
                    var fileName = key.Contains('/') ? key[(key.LastIndexOf('/') + 1)..] : key;
                    if (Guid.TryParse(fileName, out var blobId))
                        blobs.Add(blobId);
                }

                if (response.IsTruncated != true)
                    break;

                request.ContinuationToken = response.NextContinuationToken;
            }
            
            return Result.Success<IReadOnlyList<Guid>>(blobs);
        }
        catch (AmazonS3Exception ex)
        {
            logger.LogError(ex, "Failed to list blobs in S3");
            return Result<IReadOnlyList<Guid>>.Error($"Failed to list blobs in S3: {ex.Message}");
        }
    }

    public string GetObjectKey(Guid blobId)
    {
        var id = blobId.ToString("N");
        return string.IsNullOrEmpty(prefix) ? id : $"{prefix}/{id}";
    }
}
