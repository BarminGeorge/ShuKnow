using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface ISettingsService
{
    Task<Result<UserAiSettings?>> GetAsync(CancellationToken cancellationToken = default);
    
    Task<Result<UserAiSettings>> UpdateAsync(UserAiSettings settings, CancellationToken cancellationToken = default);
    
    Task<Result<UserAiSettings>> TestConnectionAsync(
        UserAiSettings settings, 
        CancellationToken cancellationToken = default);
}
