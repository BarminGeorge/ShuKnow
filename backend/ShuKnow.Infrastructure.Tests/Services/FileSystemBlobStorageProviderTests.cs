using Ardalis.Result;
using AwesomeAssertions;
using Microsoft.Extensions.Logging;
using NSubstitute;
using ShuKnow.Infrastructure.Services;

namespace ShuKnow.Infrastructure.Tests.Services;

public class FileSystemBlobStorageProviderTests
{
    private string tempDir = null!;
    private FileSystemBlobStorageProvider sut = null!;

    [SetUp]
    public void SetUp()
    {
        tempDir = Path.Combine(Path.GetTempPath(), $"blob-tests-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);
        var logger = Substitute.For<ILogger<FileSystemBlobStorageProvider>>();
        sut = new FileSystemBlobStorageProvider(tempDir, logger);
    }

    [TearDown]
    public void TearDown()
    {
        if (Directory.Exists(tempDir))
            Directory.Delete(tempDir, recursive: true);
    }

    [Test]
    public async Task SaveAsync_WhenCalledWithValidStream_ShouldWriteFileToDisk()
    {
        var blobId = Guid.NewGuid();
        var data = "hello world"u8.ToArray();
        using var stream = new MemoryStream(data);

        var result = await sut.SaveAsync(stream, blobId);

        result.Status.Should().Be(ResultStatus.Ok);
        var filePath = sut.GetBlobPath(blobId);
        File.Exists(filePath).Should().BeTrue();
        (await File.ReadAllBytesAsync(filePath)).Should().Equal(data);
    }

    [Test]
    public async Task SaveAsync_ShouldCreateShardedDirectoryStructure()
    {
        var blobId = Guid.NewGuid();
        using var stream = new MemoryStream([1, 2, 3]);

        await sut.SaveAsync(stream, blobId);

        var expectedShard = blobId.ToString("N")[..2];
        var shardDir = Path.Combine(tempDir, expectedShard);
        Directory.Exists(shardDir).Should().BeTrue();
    }

    [Test]
    public async Task SaveAsync_WhenBlobAlreadyExists_ShouldReturnError()
    {
        var blobId = Guid.NewGuid();
        using var stream1 = new MemoryStream([1]);
        using var stream2 = new MemoryStream([2]);

        await sut.SaveAsync(stream1, blobId);
        var result = await sut.SaveAsync(stream2, blobId);

        result.Status.Should().Be(ResultStatus.Error);
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
    public async Task GetRangeAsync_WhenRangeExceedsFileSize_ShouldClampToEnd()
    {
        var blobId = Guid.NewGuid();
        var data = "abcde"u8.ToArray();
        using var input = new MemoryStream(data);
        await sut.SaveAsync(input, blobId);

        var result = await sut.GetRangeAsync(blobId, 3, 100);

        result.Status.Should().Be(ResultStatus.Ok);
        await using var output = result.Value;
        using var ms = new MemoryStream();
        await output.CopyToAsync(ms);
        ms.ToArray().Should().Equal("de"u8.ToArray());
    }

    [Test]
    public async Task GetRangeAsync_WhenStartExceedsFileSize_ShouldReturnInvalid()
    {
        var blobId = Guid.NewGuid();
        using var input = new MemoryStream([1, 2, 3]);
        await sut.SaveAsync(input, blobId);

        var result = await sut.GetRangeAsync(blobId, 100, 200);

        result.Status.Should().Be(ResultStatus.Invalid);
    }

    [Test]
    public async Task GetRangeAsync_WhenBlobDoesNotExist_ShouldReturnNotFound()
    {
        var result = await sut.GetRangeAsync(Guid.NewGuid(), 0, 10);

        result.Status.Should().Be(ResultStatus.NotFound);
    }

    [Test]
    public async Task DeleteAsync_WhenBlobExists_ShouldRemoveFile()
    {
        var blobId = Guid.NewGuid();
        using var input = new MemoryStream([1, 2, 3]);
        await sut.SaveAsync(input, blobId);

        var result = await sut.DeleteAsync(blobId);

        result.Status.Should().Be(ResultStatus.Ok);
        File.Exists(sut.GetBlobPath(blobId)).Should().BeFalse();
    }

    [Test]
    public async Task DeleteAsync_WhenBlobDoesNotExist_ShouldReturnSuccess()
    {
        var result = await sut.DeleteAsync(Guid.NewGuid());

        result.Status.Should().Be(ResultStatus.Ok);
    }

    [Test]
    public async Task DeleteAsync_ShouldCleanUpEmptyShardDirectory()
    {
        var blobId = Guid.NewGuid();
        using var input = new MemoryStream([1]);
        await sut.SaveAsync(input, blobId);
        var shardDir = Path.GetDirectoryName(sut.GetBlobPath(blobId))!;

        await sut.DeleteAsync(blobId);

        Directory.Exists(shardDir).Should().BeFalse();
    }

    [Test]
    public async Task GetSizeAsync_WhenBlobExists_ShouldReturnCorrectSize()
    {
        var blobId = Guid.NewGuid();
        var data = new byte[1024];
        Random.Shared.NextBytes(data);
        using var input = new MemoryStream(data);
        await sut.SaveAsync(input, blobId);

        var result = await sut.GetSizeAsync(blobId);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().Be(1024);
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

        var result = await CollectAsync(sut.StreamWithTimestampsAsync());

        result.Should().HaveCount(2);
        result.Select(b => b.BlobId).Should().Contain(blobId1);
        result.Select(b => b.BlobId).Should().Contain(blobId2);
        result.Should().AllSatisfy(b =>
            b.CreatedAt.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(5)));
    }

    [Test]
    public async Task ListWithTimestampsAsync_WhenEmpty_ShouldReturnEmptyList()
    {
        var result = await CollectAsync(sut.StreamWithTimestampsAsync());

        result.Should().BeEmpty();
    }

    [Test]
    public async Task ListWithTimestampsAsync_WhenBasePathDoesNotExist_ShouldReturnEmptyList()
    {
        var nonExistentDir = Path.Combine(Path.GetTempPath(), $"nonexistent-{Guid.NewGuid():N}");
        var logger = Substitute.For<ILogger<FileSystemBlobStorageProvider>>();
        var provider = new FileSystemBlobStorageProvider(nonExistentDir, logger);

        var result = await CollectAsync(provider.StreamWithTimestampsAsync());

        result.Should().BeEmpty();
    }

    [Test]
    public async Task SaveAndGet_RoundTrip_ShouldPreserveContent()
    {
        var blobId = Guid.NewGuid();
        var data = new byte[8192];
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
    public async Task SaveAsync_WhenContentIsEmpty_ShouldSaveEmptyFile()
    {
        var blobId = Guid.NewGuid();
        using var input = new MemoryStream();

        var result = await sut.SaveAsync(input, blobId);

        result.Status.Should().Be(ResultStatus.Ok);
        var sizeResult = await sut.GetSizeAsync(blobId);
        sizeResult.Value.Should().Be(0);
    }

    private static async Task<List<(Guid BlobId, DateTimeOffset CreatedAt)>> CollectAsync(
        IAsyncEnumerable<(Guid BlobId, DateTimeOffset CreatedAt)> blobs)
    {
        var result = new List<(Guid BlobId, DateTimeOffset CreatedAt)>();
        await foreach (var blob in blobs)
            result.Add(blob);

        return result;
    }
}
