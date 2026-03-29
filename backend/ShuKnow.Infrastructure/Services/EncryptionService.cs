using Ardalis.Result;
using ShuKnow.Application.Interfaces;

namespace ShuKnow.Infrastructure.Services;

internal class EncryptionService : IEncryptionService
{
    public Result<string> Encrypt(string plainText)
    {
        throw new NotImplementedException();
    }

    public Result<string> Decrypt(string cipherText)
    {
        throw new NotImplementedException();
    }
}
