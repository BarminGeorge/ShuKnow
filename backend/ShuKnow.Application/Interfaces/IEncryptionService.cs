using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IEncryptionService
{
    Result<UserAiSettings> Encrypt(UserAiSettings settings);
    
    Result<UserAiSettings> Decrypt(UserAiSettings settings);
}
