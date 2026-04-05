using AwesomeAssertions;
using ShuKnow.Infrastructure.Services;

namespace ShuKnow.Infrastructure.Tests.Services;

[TestFixture]
public class BoundedReadStreamTests
{
    [Test]
    public async Task DisposeAsync_ShouldUseBaseDisposePath()
    {
        await using var inner = new MemoryStream([1, 2, 3]);
        var stream = new TrackingBoundedReadStream(inner, inner.Length);

        await stream.DisposeAsync();

        stream.DisposeCalled.Should().BeTrue();
    }

    private sealed class TrackingBoundedReadStream(Stream inner, long length) : BoundedReadStream(inner, length)
    {
        public bool DisposeCalled { get; private set; }

        protected override void Dispose(bool disposing)
        {
            DisposeCalled = true;
            base.Dispose(disposing);
        }
    }
}
