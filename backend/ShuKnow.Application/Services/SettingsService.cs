using Ardalis.Result;
using ShuKnow.Application.Interfaces;
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

    public Task<Result<UserAiSettings>> UpdateAsync(UserAiSettings settings, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }

    public Task<Result<UserAiSettings>> TestConnectionAsync(UserAiSettings settings, CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}