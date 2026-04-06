using System.Security.Cryptography;
using System.Text;
using Ardalis.Result;

namespace ShuKnow.Infrastructure.Misc;

public static class StreamExtensions
{
    public static async Task<Result<string>> ToBase64Async(this Task<Result<Stream>> resultTask,
        CancellationToken ct = default)
    {
        var streamResult = await resultTask;
        if (!streamResult.IsSuccess)
            return streamResult.Map();

        await using var stream = streamResult.Value;
        return await stream.ToBase64Async(ct);
    }
    
    public static async Task<string> ToBase64Async(this Stream stream, CancellationToken ct = default)
    {
        if (stream == null)
            throw new ArgumentNullException(nameof(stream));
        if (!stream.CanRead)
            throw new InvalidOperationException("Stream must be readable.");

        await using var outputStream = new MemoryStream();
        await using var cryptoStream = new CryptoStream(outputStream, new ToBase64Transform(), CryptoStreamMode.Write, leaveOpen: true);

        await stream.CopyToAsync(cryptoStream, 81920, ct);
        await cryptoStream.FlushFinalBlockAsync(ct);

        return Encoding.ASCII.GetString(outputStream.ToArray());
    }
}