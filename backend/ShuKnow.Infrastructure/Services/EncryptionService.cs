using System.Security.Cryptography;
using System.Text;
using Ardalis.Result;
using Microsoft.Extensions.Options;
using ShuKnow.Application.Common;
using ShuKnow.Application.Interfaces;

namespace ShuKnow.Infrastructure.Services;

public class EncryptionService(IOptions<EncryptionOptions> options) : IEncryptionService
{
    private const int NonceSize = 12;
    private const int TagSize = 16;

    private readonly byte[] key = DeriveKey(options.Value.Key);

    public Result<string> Encrypt(string plainText)
    {
        if (string.IsNullOrEmpty(plainText))
            return Result.Invalid(new ValidationError("Plain text cannot be null or empty."));

        var plainBytes = Encoding.UTF8.GetBytes(plainText);
        var nonce = new byte[NonceSize];
        RandomNumberGenerator.Fill(nonce);

        var cipherBytes = new byte[plainBytes.Length];
        var tag = new byte[TagSize];

        using var aes = new AesGcm(key, TagSize);
        aes.Encrypt(nonce, plainBytes, cipherBytes, tag);

        var combined = new byte[NonceSize + cipherBytes.Length + TagSize];
        nonce.CopyTo(combined, 0);
        cipherBytes.CopyTo(combined, NonceSize);
        tag.CopyTo(combined, NonceSize + cipherBytes.Length);

        return Result.Success(Convert.ToBase64String(combined));
    }

    public Result<string> Decrypt(string cipherText)
    {
        if (string.IsNullOrEmpty(cipherText))
            return Result.Invalid(new ValidationError("Cipher text cannot be null or empty."));

        try
        {
            return TryDecrypt(cipherText);
        }
        catch
        {
            return Result.Error("Decryption failed.");
        }
    }

    private Result<string> TryDecrypt(string cipherText)
    {
        var combined = Convert.FromBase64String(cipherText);

        if (combined.Length < NonceSize + TagSize)
            return Result.Error("Decryption failed.");

        var nonce = combined[..NonceSize];
        var cipherBytes = combined[NonceSize..^TagSize];
        var tag = combined[^TagSize..];

        var plainBytes = new byte[cipherBytes.Length];

        using var aes = new AesGcm(key, TagSize);
        aes.Decrypt(nonce, cipherBytes, tag, plainBytes);

        return Result.Success(Encoding.UTF8.GetString(plainBytes));
    }

    private static byte[] DeriveKey(string keyString)
    {
        return SHA256.HashData(Encoding.UTF8.GetBytes(keyString));
    }
}
