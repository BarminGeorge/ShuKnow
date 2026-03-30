using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Application.Services;

internal class SettingsService(
    ISettingsRepository settingsRepository,
    IEncryptionService encryptionService,
    IAiService aiService,
    ICurrentUserService currentUserService)
    : ISettingsService
{
    public Task<Result<UserAiSettings?>> GetAsync(CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<UserAiSettings>> UpdateAsync(UpdateAiSettingsInput input, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<(bool Success, int? LatencyMs, string? ErrorMessage)>> TestConnectionAsync(
        CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}