using System.Net;
using Amazon.S3;
using Amazon.S3.Model;
using AwesomeAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NSubstitute;
using ShuKnow.Application.Common;
using ShuKnow.Infrastructure.Services;

namespace ShuKnow.Infrastructure.Tests.Services;

[TestFixture]
public class S3BucketInitializationServiceTests
{
    private const string BucketName = "shuknow";

    private IAmazonS3 s3Client = null!;
    private ILogger<S3BucketInitializationService> logger = null!;
    private S3BucketInitializationService sut = null!;

    [SetUp]
    public void SetUp()
    {
        s3Client = Substitute.For<IAmazonS3>();
        logger = Substitute.For<ILogger<S3BucketInitializationService>>();
        var options = Options.Create(new S3BlobStorageOptions
        {
            BucketName = BucketName
        });

        sut = new S3BucketInitializationService(s3Client, options, logger);
    }

    [TearDown]
    public void TearDown()
    {
        if (s3Client is IDisposable disposable)
            disposable.Dispose();
    }

    [Test]
    public async Task StartAsync_WhenBucketAlreadyExists_ShouldOnlyValidate()
    {
        s3Client.ListObjectsV2Async(Arg.Any<ListObjectsV2Request>(), Arg.Any<CancellationToken>())
            .Returns(new ListObjectsV2Response());

        await sut.StartAsync(CancellationToken.None);

        await s3Client.Received(1).ListObjectsV2Async(
            Arg.Is<ListObjectsV2Request>(request => request.BucketName == BucketName && request.MaxKeys == 1),
            Arg.Any<CancellationToken>());
        await s3Client.DidNotReceive().PutBucketAsync(Arg.Any<PutBucketRequest>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task StartAsync_WhenBucketIsMissing_ShouldCreateIt()
    {
        s3Client.ListObjectsV2Async(Arg.Any<ListObjectsV2Request>(), Arg.Any<CancellationToken>())
            .Returns<Task<ListObjectsV2Response>>(_ => throw new AmazonS3Exception("missing")
            {
                StatusCode = HttpStatusCode.NotFound,
                ErrorCode = "NoSuchBucket"
            });
        s3Client.PutBucketAsync(Arg.Any<PutBucketRequest>(), Arg.Any<CancellationToken>())
            .Returns(new PutBucketResponse());

        await sut.StartAsync(CancellationToken.None);

        await s3Client.Received(1).PutBucketAsync(
            Arg.Is<PutBucketRequest>(request => request.BucketName == BucketName),
            Arg.Any<CancellationToken>());
    }

    [Test]
    public void StartAsync_WhenValidationFailsForAnotherReason_ShouldThrowClearConfigurationError()
    {
        s3Client.ListObjectsV2Async(Arg.Any<ListObjectsV2Request>(), Arg.Any<CancellationToken>())
            .Returns<Task<ListObjectsV2Response>>(_ => throw new AmazonS3Exception("denied")
            {
                StatusCode = HttpStatusCode.Forbidden
            });

        var act = async () => await sut.StartAsync(CancellationToken.None);

        act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage($"Failed to initialize S3 bucket '{BucketName}'.*");
    }
}
