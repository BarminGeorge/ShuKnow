using Ardalis.Result;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.VO;

namespace ShuKnow.Application.Interfaces;

public interface ISettingsService
{
    Task<Result<UserAiSettings?>> GetAsync(CancellationToken ct = default);
    
    Task<Result<UserAiSettings>> UpdateAsync(UpdateAiSettingsInput input, CancellationToken ct = default);
    
    Task<Result<(bool Success, int? LatencyMs, string? ErrorMessage)>> TestConnectionAsync(
        CancellationToken ct = default);
}
