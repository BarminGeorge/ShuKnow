namespace ShuKnow.Infrastructure.Services;

public class BoundedReadStream(Stream inner, long length) : Stream
{
    private long remaining = length;

    public override bool CanRead => inner.CanRead;
    public override bool CanSeek => false;
    public override bool CanWrite => false;
    public override long Length => length;

    public override long Position
    {
        get => length - remaining;
        set => throw new NotSupportedException();
    }

    public override int Read(byte[] buffer, int offset, int count)
    {
        if (remaining <= 0)
            return 0;
        
        var toRead = (int)Math.Min(count, remaining);
        var bytesRead = inner.Read(buffer, offset, toRead);
        remaining -= bytesRead;
        return bytesRead;
    }

    public override async Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken ct)
    {
        if (remaining <= 0)
            return 0;
        
        var toRead = (int)Math.Min(count, remaining);
        var bytesRead = await inner.ReadAsync(buffer.AsMemory(offset, toRead), ct);
        remaining -= bytesRead;
        return bytesRead;
    }

    public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken ct = default)
    {
        if (remaining <= 0) 
            return 0;
        
        var toRead = (int)Math.Min(buffer.Length, remaining);
        var bytesRead = await inner.ReadAsync(buffer[..toRead], ct);
        remaining -= bytesRead;
        return bytesRead;
    }

    public override void Flush() => inner.Flush();

    public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

    public override void SetLength(long value) => throw new NotSupportedException();

    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

    protected override void Dispose(bool disposing)
    {
        if (disposing) inner.Dispose();
        base.Dispose(disposing);
    }

    public override async ValueTask DisposeAsync()
    {
        await inner.DisposeAsync();
        GC.SuppressFinalize(this);
    }
}