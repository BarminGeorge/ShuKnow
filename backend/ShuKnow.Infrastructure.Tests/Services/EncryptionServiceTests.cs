using Ardalis.Result;
using AwesomeAssertions;
using Microsoft.Extensions.Options;
using ShuKnow.Application.Common;
using ShuKnow.Infrastructure.Services;

namespace ShuKnow.Infrastructure.Tests.Services;

public class EncryptionServiceTests
{
    private EncryptionService sut = null!;

    [SetUp]
    public void SetUp()
    {
        var options = Options.Create(new EncryptionOptions { Key = "test-encryption-key-for-unit-tests" });
        sut = new EncryptionService(options);
    }

    [Test]
    public void Encrypt_WhenCalledWithValidText_ShouldReturnSuccess()
    {
        var result = sut.Encrypt("hello world");

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().NotBeNullOrEmpty();
    }

    [Test]
    public void Encrypt_WhenCalledWithNullText_ShouldReturnInvalid()
    {
        var result = sut.Encrypt(null!);

        result.Status.Should().Be(ResultStatus.Invalid);
    }

    [Test]
    public void Encrypt_WhenCalledWithEmptyText_ShouldReturnInvalid()
    {
        var result = sut.Encrypt("");

        result.Status.Should().Be(ResultStatus.Invalid);
    }

    [Test]
    public void Encrypt_WhenCalledTwiceWithSameInput_ShouldProduceDifferentCiphertexts()
    {
        var result1 = sut.Encrypt("same input");
        var result2 = sut.Encrypt("same input");

        result1.Value.Should().NotBe(result2.Value);
    }

    [Test]
    public void Decrypt_WhenCalledWithEncryptedText_ShouldReturnOriginalText()
    {
        const string original = "hello world";
        var encrypted = sut.Encrypt(original);

        var result = sut.Decrypt(encrypted.Value);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().Be(original);
    }

    [Test]
    public void Decrypt_WhenCalledWithNullText_ShouldReturnInvalid()
    {
        var result = sut.Decrypt(null!);

        result.Status.Should().Be(ResultStatus.Invalid);
    }

    [Test]
    public void Decrypt_WhenCalledWithEmptyText_ShouldReturnInvalid()
    {
        var result = sut.Decrypt("");

        result.Status.Should().Be(ResultStatus.Invalid);
    }

    [Test]
    public void Decrypt_WhenCalledWithInvalidBase64_ShouldReturnError()
    {
        var result = sut.Decrypt("not-valid-base64!!!");

        result.Status.Should().Be(ResultStatus.Error);
    }

    [Test]
    public void Decrypt_WhenCalledWithTooShortData_ShouldReturnError()
    {
        var shortData = Convert.ToBase64String(new byte[10]);

        var result = sut.Decrypt(shortData);

        result.Status.Should().Be(ResultStatus.Error);
    }

    [Test]
    public void Decrypt_WhenCalledWithTamperedCiphertext_ShouldReturnError()
    {
        var encrypted = sut.Encrypt("hello world");
        var bytes = Convert.FromBase64String(encrypted.Value);
        bytes[15] ^= 0xFF;
        var tampered = Convert.ToBase64String(bytes);

        var result = sut.Decrypt(tampered);

        result.Status.Should().Be(ResultStatus.Error);
    }

    [Test]
    public void Decrypt_WhenCalledWithDifferentKey_ShouldReturnError()
    {
        var encrypted = sut.Encrypt("hello world");

        var differentOptions = Options.Create(new EncryptionOptions { Key = "different-key" });
        var differentService = new EncryptionService(differentOptions);

        var result = differentService.Decrypt(encrypted.Value);

        result.Status.Should().Be(ResultStatus.Error);
    }

    [Test]
    [TestCase("Simple text")]
    [TestCase("Unicode: 你好世界 🌍")]
    [TestCase("Special chars: !@#$%^&*()")]
    [TestCase("A")]
    public void EncryptDecrypt_RoundTrip_ShouldPreserveOriginalText(string input)
    {
        var encrypted = sut.Encrypt(input);
        var decrypted = sut.Decrypt(encrypted.Value);

        decrypted.Status.Should().Be(ResultStatus.Ok);
        decrypted.Value.Should().Be(input);
    }
}
