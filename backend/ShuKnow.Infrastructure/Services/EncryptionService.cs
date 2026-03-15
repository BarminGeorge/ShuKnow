using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Infrastructure.Services;

internal class EncryptionService : IEncryptionService
{
    public Result<UserAiSettings> Encrypt(UserAiSettings settings)
    {
        throw new NotImplementedException();
    }

    public Result<UserAiSettings> Decrypt(UserAiSettings settings)
    {
        throw new NotImplementedException();
    }
}