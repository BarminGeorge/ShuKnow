using Amazon.S3;
using Amazon.S3.Model;
using Ardalis.Result;
using AwesomeAssertions;
using Microsoft.Extensions.Logging;
using NSubstitute;
using ShuKnow.Infrastructure.Services;

namespace ShuKnow.Infrastructure.Tests.Services;

[TestFixture]
public class S3BlobStorageProviderTests
{
    private IAmazonS3 s3Client = null!;
    private ILogger<S3BlobStorageProvider> logger = null!;
    private S3BlobStorageProvider sut = null!;
    private PutObjectRequest? capturedRequest;

    [SetUp]
    public void SetUp()
    {
        s3Client = Substitute.For<IAmazonS3>();
        logger = Substitute.For<ILogger<S3BlobStorageProvider>>();
        capturedRequest = null;

        s3Client.PutObjectAsync(Arg.Do<PutObjectRequest>(request => capturedRequest = request), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(new PutObjectResponse()));

        sut = new S3BlobStorageProvider(s3Client, "test-bucket", "test-prefix", logger);
    }

    [Test]
    public async Task SaveAsync_WhenContentIsSeekable_ShouldSendRemainingContentLength()
    {
        var blobId = Guid.NewGuid();
        await using var content = new MemoryStream([10, 20, 30, 40, 50]);
        content.Position = 2;

        var result = await sut.SaveAsync(content, blobId);

        result.Status.Should().Be(ResultStatus.Ok);
        capturedRequest.Should().NotBeNull();
        capturedRequest!.Headers.ContentLength.Should().Be(3);
        capturedRequest.BucketName.Should().Be("test-bucket");
        capturedRequest.Key.Should().Be($"test-prefix/{blobId:N}");
    }

    [Test]
    public async Task SaveAsync_WhenContentIsNotSeekable_ShouldBufferAndSendContentLength()
    {
        var blobId = Guid.NewGuid();
        await using var content = new NonSeekableReadStream([1, 2, 3, 4]);

        var result = await sut.SaveAsync(content, blobId);

        result.Status.Should().Be(ResultStatus.Ok);
        capturedRequest.Should().NotBeNull();
        capturedRequest!.Headers.ContentLength.Should().Be(4);
        capturedRequest.InputStream.CanSeek.Should().BeTrue();
    }

    private sealed class NonSeekableReadStream(byte[] data) : Stream
    {
        private readonly MemoryStream inner = new(data);

        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();
        public override long Position
        {
            get => throw new NotSupportedException();
            set => throw new NotSupportedException();
        }

        public override int Read(byte[] buffer, int offset, int count) => inner.Read(buffer, offset, count);
        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
            => inner.ReadAsync(buffer, cancellationToken);
        public override Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
            => inner.ReadAsync(buffer, offset, count, cancellationToken);

        public override void Flush() { }
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        protected override void Dispose(bool disposing)
        {
            if (disposing)
                inner.Dispose();
            base.Dispose(disposing);
        }

        public override ValueTask DisposeAsync()
        {
            return inner.DisposeAsync();
        }
    }
}
