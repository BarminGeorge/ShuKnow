using Ardalis.Result;

namespace ShuKnow.Application.Interfaces;

public interface IEncryptionService
{
    Result<string> Encrypt(string plainText);

    Result<string> Decrypt(string cipherText);
}
