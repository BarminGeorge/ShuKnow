using Amazon.S3;
using Amazon.S3.Model;
using AwesomeAssertions;
using Microsoft.Extensions.Logging;
using NSubstitute;
using ShuKnow.Infrastructure.Services;

namespace ShuKnow.Infrastructure.Tests.Services;

public class S3BlobStorageProviderTests
{
    private const string BucketName = "test-bucket";
    private const string Prefix = "blobs";

    private IAmazonS3 s3Client = null!;
    private S3BlobStorageProvider sut = null!;

    [SetUp]
    public void SetUp()
    {
        s3Client = Substitute.For<IAmazonS3>();
        s3Client.PutObjectAsync(Arg.Any<PutObjectRequest>(), Arg.Any<CancellationToken>())
            .Returns(new PutObjectResponse());

        var logger = Substitute.For<ILogger<S3BlobStorageProvider>>();
        sut = new S3BlobStorageProvider(s3Client, BucketName, Prefix, logger);
    }

    [TearDown]
    public void TearDown()
    {
        s3Client.Dispose();
    }

    [Test]
    public async Task SaveAsync_WhenStreamIsNotSeekable_ShouldBufferAndSetContentLength()
    {
        var blobId = Guid.NewGuid();
        var data = "hello s3"u8.ToArray();
        await using var stream = new NonSeekableReadStream(data);
        PutObjectRequest? request = null;
        byte[]? uploadedData = null;
        s3Client.PutObjectAsync(Arg.Do<PutObjectRequest>(x =>
            {
                request = x;
                using var copy = new MemoryStream();
                x.InputStream.CopyTo(copy);
                uploadedData = copy.ToArray();
            }), Arg.Any<CancellationToken>())
            .Returns(new PutObjectResponse());

        var result = await sut.SaveAsync(stream, blobId);

        result.IsSuccess.Should().BeTrue();
        await s3Client.Received(1).PutObjectAsync(Arg.Any<PutObjectRequest>(), Arg.Any<CancellationToken>());
        request.Should().NotBeNull();
        request!.BucketName.Should().Be(BucketName);
        request.Key.Should().Be($"{Prefix}/{blobId:N}");
        request.Headers.ContentLength.Should().Be(data.Length);
        request.InputStream.Should().NotBeSameAs(stream);
        uploadedData.Should().Equal(data);
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

        public override void Flush()
        {
        }

        public override int Read(byte[] buffer, int offset, int count)
            => inner.Read(buffer, offset, count);

        public override long Seek(long offset, SeekOrigin origin)
            => throw new NotSupportedException();

        public override void SetLength(long value)
            => throw new NotSupportedException();

        public override void Write(byte[] buffer, int offset, int count)
            => throw new NotSupportedException();

        protected override void Dispose(bool disposing)
        {
            if (disposing)
                inner.Dispose();

            base.Dispose(disposing);
        }
    }
}
