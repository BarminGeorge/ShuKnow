using Ardalis.Result;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;
using ShuKnow.Domain.VO;

namespace ShuKnow.Application.Services;

internal class SettingsService(
    ISettingsRepository settingsRepository,
    IEncryptionService encryptionService,
    IAiService aiService,
    ICurrentUserService currentUserService,
    IUnitOfWork unitOfWork)
    : ISettingsService
{
    public async Task<Result<UserAiSettings>> GetOrCreateAsync(CancellationToken ct = default)
    {
        var result = await settingsRepository.GetByUserAsync(currentUserService.UserId);
        if (!result.IsNotFound())
            return result;
        
        var newSettings = new UserAiSettings(currentUserService.UserId);
        
        return await settingsRepository.UpsertAsync(newSettings)
            .SaveChangesAsync(unitOfWork);
    }

    public async Task<Result<UserAiSettings>> UpdateAsync(UpdateAiSettingsInput input, CancellationToken ct = default)
    {
        var encryptResult = input.ApiKey is not null 
            ? encryptionService.Encrypt(input.ApiKey).Map(s => (string?)s)
            : Result.Success<string?>(null);

        return await GetOrCreateAsync(ct)
            .Act(existing => encryptResult
                .Act(encrypted => existing.UpdateSettings(input.BaseUrl, encrypted, input.Provider, input.ModelId)))
            .ActAsync(settingsRepository.UpsertAsync)
            .SaveChangesAsync(unitOfWork);
    }

    public Task<Result<(bool Success, int? LatencyMs, string? ErrorMessage)>> TestConnectionAsync(
        CancellationToken ct = default)
    {
        return settingsRepository.GetByUserAsync(currentUserService.UserId)
            .MapAsync(settings => aiService.TestConnectionAsync(settings, ct))
            .ActAsync(settingsRepository.UpsertAsync)
            .SaveChangesAsync(unitOfWork)
            .MapAsync(tested => (tested.LastTestSuccess ?? false, tested.LastTestLatencyMs, tested.LastTestError));
    }
}