using Ardalis.Result;
using AwesomeAssertions;
using NSubstitute;
using ShuKnow.Infrastructure.Interfaces;
using ShuKnow.Infrastructure.Services;

namespace ShuKnow.Infrastructure.Tests.Services;

public class BlobStorageServiceTests
{
    private IBlobStorageProvider provider = null!;
    private BlobStorageService sut = null!;

    [SetUp]
    public void SetUp()
    {
        provider = Substitute.For<IBlobStorageProvider>();
        sut = new BlobStorageService(provider);
    }

    [Test]
    public async Task SaveAsync_ShouldDelegateToProvider()
    {
        var blobId = Guid.NewGuid();
        using var stream = new MemoryStream([1, 2, 3]);
        provider.SaveAsync(stream, blobId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success()));

        var result = await sut.SaveAsync(stream, blobId);

        result.Status.Should().Be(ResultStatus.Ok);
        await provider.Received(1).SaveAsync(stream, blobId, Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task SaveAsync_WhenProviderFails_ShouldReturnError()
    {
        var blobId = Guid.NewGuid();
        using var stream = new MemoryStream([1]);
        provider.SaveAsync(stream, blobId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Error("save failed")));

        var result = await sut.SaveAsync(stream, blobId);

        result.Status.Should().Be(ResultStatus.Error);
    }

    [Test]
    public async Task GetAsync_ShouldDelegateToProvider()
    {
        var blobId = Guid.NewGuid();
        var expectedStream = new MemoryStream([1, 2]);
        provider.GetAsync(blobId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<Stream>(expectedStream)));

        var result = await sut.GetAsync(blobId);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(expectedStream);
        await provider.Received(1).GetAsync(blobId, Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task GetAsync_WhenProviderReturnsNotFound_ShouldReturnNotFound()
    {
        var blobId = Guid.NewGuid();
        provider.GetAsync(blobId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<Stream>.NotFound()));

        var result = await sut.GetAsync(blobId);

        result.Status.Should().Be(ResultStatus.NotFound);
    }

    [Test]
    public async Task GetRangeAsync_ShouldDelegateToProvider()
    {
        var blobId = Guid.NewGuid();
        var expectedStream = new MemoryStream([3, 4]);
        provider.GetRangeAsync(blobId, 10, 20, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<Stream>(expectedStream)));

        var result = await sut.GetRangeAsync(blobId, 10, 20);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(expectedStream);
        await provider.Received(1).GetRangeAsync(blobId, 10, 20, Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task GetRangeAsync_WhenProviderReturnsInvalid_ShouldReturnInvalid()
    {
        var blobId = Guid.NewGuid();
        provider.GetRangeAsync(blobId, 100, 200, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<Stream>.Invalid(new ValidationError("bad range"))));

        var result = await sut.GetRangeAsync(blobId, 100, 200);

        result.Status.Should().Be(ResultStatus.Invalid);
    }

    [Test]
    public async Task DeleteAsync_ShouldDelegateToProvider()
    {
        var blobId = Guid.NewGuid();
        provider.DeleteAsync(blobId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success()));

        var result = await sut.DeleteAsync(blobId);

        result.Status.Should().Be(ResultStatus.Ok);
        await provider.Received(1).DeleteAsync(blobId, Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task DeleteAsync_WhenProviderFails_ShouldReturnError()
    {
        var blobId = Guid.NewGuid();
        provider.DeleteAsync(blobId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Error("delete failed")));

        var result = await sut.DeleteAsync(blobId);

        result.Status.Should().Be(ResultStatus.Error);
    }

    [Test]
    public async Task GetSizeAsync_ShouldDelegateToProvider()
    {
        var blobId = Guid.NewGuid();
        provider.GetSizeAsync(blobId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success(1024L)));

        var result = await sut.GetSizeAsync(blobId);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().Be(1024L);
        await provider.Received(1).GetSizeAsync(blobId, Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task GetSizeAsync_WhenProviderReturnsNotFound_ShouldReturnNotFound()
    {
        var blobId = Guid.NewGuid();
        provider.GetSizeAsync(blobId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<long>.NotFound()));

        var result = await sut.GetSizeAsync(blobId);

        result.Status.Should().Be(ResultStatus.NotFound);
    }
}
