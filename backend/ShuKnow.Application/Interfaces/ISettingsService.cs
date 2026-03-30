using Ardalis.Result;
using ShuKnow.Application.Models;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface ISettingsService
{
    Task<Result<UserAiSettings?>> GetAsync(CancellationToken ct = default);
    
    Task<Result<UserAiSettings>> UpdateAsync(UpdateAiSettingsInput input, CancellationToken ct = default);
    
    Task<Result<(bool Success, int? LatencyMs, string? ErrorMessage)>> TestConnectionAsync(
        CancellationToken ct = default);
}
