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
    public async Task<Result<UserAiSettings?>> GetAsync(CancellationToken ct = default)
    {
        var result = await settingsRepository.GetByUserAsync(currentUserService.UserId);

        return result.Status == ResultStatus.NotFound
            ? Result.Success<UserAiSettings?>(null)
            : result.Map(s => (UserAiSettings?)s);
    }

    public async Task<Result<UserAiSettings>> UpdateAsync(UpdateAiSettingsInput input, CancellationToken ct = default)
    {
        var existingResult = await settingsRepository.GetByUserForUpdateAsync(currentUserService.UserId);
        if (existingResult.IsNotFound())
            existingResult = Result.Success(new UserAiSettings(currentUserService.UserId));
        
        var encryptResult = input.ApiKey is not null 
            ? encryptionService.Encrypt(input.ApiKey).Map(s => (string?)s)
            : Result.Success<string?>(null);

        return await existingResult
            .Act(existing => encryptResult
                .Act(encrypted => existing.UpdateSettings(input.BaseUrl, encrypted, input.Provider, input.ModelId)))
            .SaveChangesAsync(unitOfWork);
    }

    public Task<Result<(bool Success, int? LatencyMs, string? ErrorMessage)>> TestConnectionAsync(
        CancellationToken ct = default)
    {
        return settingsRepository.GetByUserAsync(currentUserService.UserId)
            .BindAsync(settings => aiService.TestConnectionAsync(settings, ct))
            .ActAsync(settingsRepository.UpsertAsync)
            .SaveChangesAsync(unitOfWork)
            .MapAsync(tested => (tested.LastTestSuccess ?? false, tested.LastTestLatencyMs, tested.LastTestError));
    }
}