using Ardalis.Result;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Infrastructure.Services;

internal class EncryptionService(IConfiguration configuration) : IEncryptionService
{
    private const string EncryptionKeyConfigPath = "Encryption:Key";
    private const int NonceLength = 12;
    private const int TagLength = 16;

    public Result<UserAiSettings> Encrypt(UserAiSettings settings)
    {
        if (string.IsNullOrWhiteSpace(settings.ApiKeyEncrypted))
        {
            return Result.Success(settings);
        }

        var keyResult = GetEncryptionKey();
        if (!keyResult.IsSuccess)
        {
            return Result<UserAiSettings>.Error(string.Join("; ", keyResult.Errors));
        }

        try
        {
            var plainTextBytes = Encoding.UTF8.GetBytes(settings.ApiKeyEncrypted);
            var nonce = new byte[NonceLength];
            RandomNumberGenerator.Fill(nonce);

            var cipherText = new byte[plainTextBytes.Length];
            var tag = new byte[TagLength];

            using var aesGcm = new AesGcm(keyResult.Value, TagLength);
            aesGcm.Encrypt(nonce, plainTextBytes, cipherText, tag);

            var encryptedPayload = new byte[NonceLength + TagLength + cipherText.Length];
            Buffer.BlockCopy(nonce, 0, encryptedPayload, 0, NonceLength);
            Buffer.BlockCopy(tag, 0, encryptedPayload, NonceLength, TagLength);
            Buffer.BlockCopy(cipherText, 0, encryptedPayload, NonceLength + TagLength, cipherText.Length);

            return Result.Success(CloneWithApiKey(settings, Convert.ToBase64String(encryptedPayload)));
        }
        catch (CryptographicException ex)
        {
            return Result<UserAiSettings>.Error($"Failed to encrypt API key: {ex.Message}");
        }
    }

    public Result<UserAiSettings> Decrypt(UserAiSettings settings)
    {
        if (string.IsNullOrWhiteSpace(settings.ApiKeyEncrypted))
        {
            return Result.Success(settings);
        }

        var keyResult = GetEncryptionKey();
        if (!keyResult.IsSuccess)
        {
            return Result<UserAiSettings>.Error(string.Join("; ", keyResult.Errors));
        }

        byte[] encryptedPayload;
        try
        {
            encryptedPayload = Convert.FromBase64String(settings.ApiKeyEncrypted);
        }
        catch (FormatException)
        {
            return Result<UserAiSettings>.Error("Failed to decrypt API key: encrypted value has invalid format.");
        }

        if (encryptedPayload.Length < NonceLength + TagLength)
        {
            return Result<UserAiSettings>.Error("Failed to decrypt API key: encrypted value is too short.");
        }

        try
        {
            var nonce = encryptedPayload[..NonceLength];
            var tag = encryptedPayload[NonceLength..(NonceLength + TagLength)];
            var cipherText = encryptedPayload[(NonceLength + TagLength)..];
            var plainTextBytes = new byte[cipherText.Length];

            using var aesGcm = new AesGcm(keyResult.Value, TagLength);
            aesGcm.Decrypt(nonce, cipherText, tag, plainTextBytes);

            return Result.Success(CloneWithApiKey(settings, Encoding.UTF8.GetString(plainTextBytes)));
        }
        catch (CryptographicException)
        {
            return Result<UserAiSettings>.Error("Failed to decrypt API key: encrypted value is invalid or corrupted.");
        }
    }

    private Result<byte[]> GetEncryptionKey()
    {
        var key = configuration[EncryptionKeyConfigPath];
        if (string.IsNullOrWhiteSpace(key))
        {
            return Result<byte[]>.Error($"Encryption key is not configured. Set '{EncryptionKeyConfigPath}'.");
        }

        byte[] keyBytes;
        try
        {
            keyBytes = Convert.FromBase64String(key);
        }
        catch (FormatException)
        {
            return Result<byte[]>.Error(
                $"Encryption key has invalid format. '{EncryptionKeyConfigPath}' must be a base64-encoded 32-byte key.");
        }

        if (keyBytes.Length != 32)
        {
            return Result<byte[]>.Error(
                $"Encryption key has invalid length. '{EncryptionKeyConfigPath}' must decode to exactly 32 bytes.");
        }

        return Result.Success(keyBytes);
    }

    private static UserAiSettings CloneWithApiKey(UserAiSettings settings, string apiKey)
    {
        return new UserAiSettings(
            settings.UserId,
            settings.BaseUrl,
            apiKey,
            settings.LastTestSuccess,
            settings.LastTestLatencyMs,
            settings.LastTestError);
    }
}
