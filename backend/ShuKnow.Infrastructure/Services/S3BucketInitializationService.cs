using System.Net;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ShuKnow.Application.Common;

namespace ShuKnow.Infrastructure.Services;

public sealed class S3BucketInitializationService(
    IAmazonS3 s3Client,
    IOptions<S3BlobStorageOptions> options,
    ILogger<S3BucketInitializationService> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var bucketName = options.Value.BucketName;

        try
        {
            await EnsureBucketExistsAsync(bucketName, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (AmazonS3Exception ex)
        {
            throw new InvalidOperationException(
                $"Failed to initialize S3 bucket '{bucketName}'. Check BlobStorage:S3 configuration and permissions.",
                ex);
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task EnsureBucketExistsAsync(string bucketName, CancellationToken cancellationToken)
    {
        try
        {
            await s3Client.ListObjectsV2Async(new ListObjectsV2Request
            {
                BucketName = bucketName,
                MaxKeys = 1
            }, cancellationToken);

            logger.LogInformation("Validated S3 bucket {BucketName}", bucketName);
        }
        catch (AmazonS3Exception ex) when (IsMissingBucket(ex))
        {
            logger.LogInformation("S3 bucket {BucketName} was not found. Creating it.", bucketName);

            await s3Client.PutBucketAsync(new PutBucketRequest
            {
                BucketName = bucketName
            }, cancellationToken);

            logger.LogInformation("Created S3 bucket {BucketName}", bucketName);
        }
    }

    private static bool IsMissingBucket(AmazonS3Exception ex)
    {
        return ex.StatusCode == HttpStatusCode.NotFound
            || string.Equals(ex.ErrorCode, "NoSuchBucket", StringComparison.Ordinal);
    }
}
