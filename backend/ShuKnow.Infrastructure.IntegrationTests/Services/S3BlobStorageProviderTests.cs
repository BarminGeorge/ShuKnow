using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Ardalis.Result;
using AwesomeAssertions;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using Microsoft.Extensions.Logging;
using NSubstitute;
using ShuKnow.Infrastructure.Services;

namespace ShuKnow.Infrastructure.IntegrationTests.Services;

[TestFixture]
public class S3BlobStorageProviderTests
{
    private const string BucketName = "test-bucket";
    private const string Prefix = "blobs";
    private const int S3Port = 9000;
    private const int ConsolePort = 9001;

    private IContainer? rustFsContainer;
    private IAmazonS3? s3Client;
    private S3BlobStorageProvider sut = null!;
    private string? setupError;

    [OneTimeSetUp]
    public async Task OneTimeSetUp()
    {
        try
        {
            rustFsContainer = new ContainerBuilder("rustfs/rustfs:latest")
                .WithPortBinding(S3Port, true)
                .WithPortBinding(ConsolePort, true)
                .WithEnvironment("RUSTFS_ADDRESS", ":9000")
                .WithEnvironment("RUSTFS_ACCESS_KEY", "rustfsadmin")
                .WithEnvironment("RUSTFS_SECRET_KEY", "rustfsadmin")
                .WithEnvironment("RUSTFS_CONSOLE_ENABLE", "true")
                .WithCommand("/data")
                .WithWaitStrategy(Wait.ForUnixContainer()
                    .UntilInternalTcpPortIsAvailable(S3Port))
                .Build();
            
            await rustFsContainer.StartAsync();

            var port = rustFsContainer.GetMappedPublicPort(S3Port);
            var serviceUrl = $"http://{rustFsContainer.Hostname}:{port}";

            var config = new AmazonS3Config
            {
                ServiceURL = serviceUrl,
                ForcePathStyle = true
            };
            var credentials = new BasicAWSCredentials("rustfsadmin", "rustfsadmin");
            s3Client = new AmazonS3Client(credentials, config);

            await s3Client.PutBucketAsync(BucketName);
        }
        catch (Exception ex)
        {
            setupError = $"OneTimeSetUp failed: {ex}";
            TestContext.Progress.WriteLine($"[S3Test] {setupError}");
        }
    }

    [SetUp]
    public async Task SetUp()
    {
        if (setupError is not null)
            Assert.Fail(setupError);

        await CleanBucketAsync();

        var logger = Substitute.For<ILogger<S3BlobStorageProvider>>();
        sut = new S3BlobStorageProvider(s3Client!, BucketName, Prefix, logger);
    }

    [OneTimeTearDown]
    public async Task OneTimeTearDown()
    {
        s3Client?.Dispose();
        if (rustFsContainer is not null)
            await rustFsContainer.DisposeAsync();
    }

    [Test]
    public async Task SaveAsync_WhenCalledWithValidStream_ShouldSaveBlob()
    {
        var blobId = Guid.NewGuid();
        var data = "hello s3"u8.ToArray();
        using var stream = new MemoryStream(data);

        var result = await sut.SaveAsync(stream, blobId);

        result.Status.Should().Be(ResultStatus.Ok);
        var existsResult = await sut.ExistsAsync(blobId);
        existsResult.Value.Should().BeTrue();
    }

    [Test]
    public async Task GetAsync_WhenBlobExists_ShouldReturnStream()
    {
        var blobId = Guid.NewGuid();
        var data = "test content"u8.ToArray();
        using var input = new MemoryStream(data);
        await sut.SaveAsync(input, blobId);

        var result = await sut.GetAsync(blobId);

        result.Status.Should().Be(ResultStatus.Ok);
        await using var output = result.Value;
        using var ms = new MemoryStream();
        await output.CopyToAsync(ms);
        ms.ToArray().Should().Equal(data);
    }

    [Test]
    public async Task GetAsync_WhenBlobDoesNotExist_ShouldReturnNotFound()
    {
        var result = await sut.GetAsync(Guid.NewGuid());

        result.Status.Should().Be(ResultStatus.NotFound);
    }

    [Test]
    public async Task GetRangeAsync_ShouldReturnCorrectRange()
    {
        var blobId = Guid.NewGuid();
        var data = "0123456789"u8.ToArray();
        using var input = new MemoryStream(data);
        await sut.SaveAsync(input, blobId);

        var result = await sut.GetRangeAsync(blobId, 3, 7);

        result.Status.Should().Be(ResultStatus.Ok);
        await using var output = result.Value;
        using var ms = new MemoryStream();
        await output.CopyToAsync(ms);
        ms.ToArray().Should().Equal("3456"u8.ToArray());
    }

    [Test]
    public async Task GetRangeAsync_WhenBlobDoesNotExist_ShouldReturnNotFound()
    {
        var result = await sut.GetRangeAsync(Guid.NewGuid(), 0, 10);

        result.Status.Should().Be(ResultStatus.NotFound);
    }

    [Test]
    public async Task DeleteAsync_WhenBlobExists_ShouldRemoveBlob()
    {
        var blobId = Guid.NewGuid();
        using var input = new MemoryStream([1, 2, 3]);
        await sut.SaveAsync(input, blobId);

        var result = await sut.DeleteAsync(blobId);

        result.Status.Should().Be(ResultStatus.Ok);
        var existsResult = await sut.ExistsAsync(blobId);
        existsResult.Value.Should().BeFalse();
    }

    [Test]
    public async Task DeleteAsync_WhenBlobDoesNotExist_ShouldReturnSuccess()
    {
        var result = await sut.DeleteAsync(Guid.NewGuid());

        result.Status.Should().Be(ResultStatus.Ok);
    }

    [Test]
    public async Task GetSizeAsync_WhenBlobExists_ShouldReturnCorrectSize()
    {
        var blobId = Guid.NewGuid();
        var data = new byte[512];
        Random.Shared.NextBytes(data);
        using var input = new MemoryStream(data);
        await sut.SaveAsync(input, blobId);

        var result = await sut.GetSizeAsync(blobId);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().Be(512);
    }

    [Test]
    public async Task GetSizeAsync_WhenBlobDoesNotExist_ShouldReturnNotFound()
    {
        var result = await sut.GetSizeAsync(Guid.NewGuid());

        result.Status.Should().Be(ResultStatus.NotFound);
    }

    [Test]
    public async Task ExistsAsync_WhenBlobExists_ShouldReturnTrue()
    {
        var blobId = Guid.NewGuid();
        using var input = new MemoryStream([1]);
        await sut.SaveAsync(input, blobId);

        var result = await sut.ExistsAsync(blobId);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeTrue();
    }

    [Test]
    public async Task ExistsAsync_WhenBlobDoesNotExist_ShouldReturnFalse()
    {
        var result = await sut.ExistsAsync(Guid.NewGuid());

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeFalse();
    }

    [Test]
    public async Task ListWithTimestampsAsync_ShouldReturnAllBlobIdsWithTimestamps()
    {
        var blobId1 = Guid.NewGuid();
        var blobId2 = Guid.NewGuid();
        using var s1 = new MemoryStream([1]);
        using var s2 = new MemoryStream([2]);
        await sut.SaveAsync(s1, blobId1);
        await sut.SaveAsync(s2, blobId2);

        var result = await sut.ListWithTimestampsAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().HaveCount(2);
        result.Value.Select(b => b.BlobId).Should().Contain(blobId1);
        result.Value.Select(b => b.BlobId).Should().Contain(blobId2);
        result.Value.Should().AllSatisfy(b =>
            b.CreatedAt.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(10)));
    }

    [Test]
    public async Task ListWithTimestampsAsync_WhenEmpty_ShouldReturnEmptyList()
    {
        var result = await sut.ListWithTimestampsAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeEmpty();
    }

    [Test]
    public async Task SaveAndGet_RoundTrip_ShouldPreserveContent()
    {
        var blobId = Guid.NewGuid();
        var data = new byte[4096];
        Random.Shared.NextBytes(data);
        using var input = new MemoryStream(data);

        await sut.SaveAsync(input, blobId);
        var getResult = await sut.GetAsync(blobId);

        await using var output = getResult.Value;
        using var ms = new MemoryStream();
        await output.CopyToAsync(ms);
        ms.ToArray().Should().Equal(data);
    }

    [Test]
    public void GetObjectKey_ShouldIncludePrefix()
    {
        var blobId = Guid.NewGuid();
        var key = sut.GetObjectKey(blobId);

        key.Should().StartWith($"{Prefix}/");
        key.Should().EndWith(blobId.ToString("N"));
    }

    private async Task CleanBucketAsync()
    {
        var listResponse = await s3Client!.ListObjectsV2Async(
            new ListObjectsV2Request { BucketName = BucketName });

        if (listResponse.S3Objects is null)
            return;

        foreach (var obj in listResponse.S3Objects)
        {
            await s3Client.DeleteObjectAsync(BucketName, obj.Key);
        }
    }
}
