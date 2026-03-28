using Ardalis.Result;
using AwesomeAssertions;
using Microsoft.Extensions.Configuration;
using ShuKnow.Domain.Entities;
using ShuKnow.Infrastructure.Services;

namespace ShuKnow.Application.Tests.Services;

public class EncryptionServiceTests
{
    private const string EncryptionKey = "test-encryption-key";
    private EncryptionService sut = null!;

    [SetUp]
    public void SetUp()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Encryption:Key"] = EncryptionKey,
            })
            .Build();

        sut = new EncryptionService(configuration);
    }

    [Test]
    public void Encrypt_WhenApiKeyIsProvided_ShouldReturnEncryptedSettings()
    {
        var settings = CreateSettings("sk-my-secret-api-key");

        var result = sut.Encrypt(settings);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.ApiKeyEncrypted.Should().NotBe(settings.ApiKeyEncrypted);
        result.Value.BaseUrl.Should().Be(settings.BaseUrl);
        result.Value.UserId.Should().Be(settings.UserId);
    }

    [Test]
    public void EncryptAndDecrypt_WhenCalledSequentially_ShouldReturnOriginalApiKey()
    {
        var settings = CreateSettings("sk-round-trip-secret");

        var encryptResult = sut.Encrypt(settings);
        var decryptResult = sut.Decrypt(encryptResult.Value);

        decryptResult.Status.Should().Be(ResultStatus.Ok);
        decryptResult.Value.ApiKeyEncrypted.Should().Be(settings.ApiKeyEncrypted);
        decryptResult.Value.BaseUrl.Should().Be(settings.BaseUrl);
        decryptResult.Value.UserId.Should().Be(settings.UserId);
    }

    [Test]
    public void Decrypt_WhenEncryptedValueHasInvalidFormat_ShouldReturnError()
    {
        var settings = CreateSettings("not-base64-value");

        var result = sut.Decrypt(settings);

        result.Status.Should().Be(ResultStatus.Error);
    }

    [Test]
    public void Encrypt_WhenEncryptionKeyMissing_ShouldReturnError()
    {
        var emptyConfiguration = new ConfigurationBuilder().Build();
        var service = new EncryptionService(emptyConfiguration);
        var settings = CreateSettings("sk-no-key");

        var result = service.Encrypt(settings);

        result.Status.Should().Be(ResultStatus.Error);
    }

    private static UserAiSettings CreateSettings(string apiKey)
    {
        return new UserAiSettings(
            Guid.NewGuid(),
            "https://api.openai.com/v1",
            apiKey,
            lastTestSuccess: true,
            lastTestLatencyMs: 150,
            lastTestError: null);
    }
}
