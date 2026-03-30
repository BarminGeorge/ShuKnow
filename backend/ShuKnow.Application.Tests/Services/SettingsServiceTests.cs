using Ardalis.Result;
using AwesomeAssertions;
using NSubstitute;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Services;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Enums;
using ShuKnow.Domain.Repositories;
using ShuKnow.Domain.VO;

namespace ShuKnow.Application.Tests.Services;

public class SettingsServiceTests
{
    private ISettingsRepository settingsRepository = null!;
    private IEncryptionService encryptionService = null!;
    private IAiService aiService = null!;
    private ICurrentUserService currentUserService = null!;
    private IUnitOfWork unitOfWork = null!;
    private Guid currentUserId;
    private SettingsService sut = null!;

    [SetUp]
    public void SetUp()
    {
        settingsRepository = Substitute.For<ISettingsRepository>();
        encryptionService = Substitute.For<IEncryptionService>();
        aiService = Substitute.For<IAiService>();
        currentUserService = Substitute.For<ICurrentUserService>();
        unitOfWork = Substitute.For<IUnitOfWork>();
        currentUserId = Guid.NewGuid();

        currentUserService.UserId.Returns(currentUserId);
        ConfigureDefaults();

        sut = new SettingsService(
            settingsRepository,
            encryptionService,
            aiService,
            currentUserService,
            unitOfWork);
    }

    #region GetAsync

    [Test]
    public async Task GetAsync_WhenSettingsExist_ShouldReturnSettings()
    {
        var settings = CreateSettings();
        settingsRepository.GetByUserAsync(currentUserId).Returns(Success(settings));

        var result = await sut.GetAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(settings);
    }

    [Test]
    public async Task GetAsync_WhenSettingsNotFound_ShouldReturnSuccessWithNull()
    {
        settingsRepository.GetByUserAsync(currentUserId).Returns(NotFound<UserAiSettings>());

        var result = await sut.GetAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeNull();
    }

    [Test]
    public async Task GetAsync_WhenRepositoryReturnsError_ShouldPropagateError()
    {
        settingsRepository.GetByUserAsync(currentUserId).Returns(Error<UserAiSettings>());

        var result = await sut.GetAsync();

        result.Status.Should().Be(ResultStatus.Error);
    }

    #endregion

    #region UpdateAsync

    [Test]
    public async Task UpdateAsync_WhenExistingSettingsFound_ShouldMutateAndSave()
    {
        var existing = CreateSettings();
        settingsRepository.GetByUserForUpdateAsync(currentUserId).Returns(Success(existing));

        var input = new UpdateAiSettingsInput("https://new-api.com/v1", "sk-new-key", AiProvider.Anthropic, "claude-3");
        encryptionService.Encrypt("sk-new-key").Returns(Result.Success("new-encrypted"));

        var result = await sut.UpdateAsync(input);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(existing);
        existing.BaseUrl.Should().Be("https://new-api.com/v1");
        existing.ApiKeyEncrypted.Should().Be("new-encrypted");
        existing.Provider.Should().Be(AiProvider.Anthropic);
        existing.ModelId.Should().Be("claude-3");
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task UpdateAsync_WhenNoExistingSettings_ShouldCreateNewEntityAndSave()
    {
        var input = new UpdateAiSettingsInput("https://api.openai.com/v1", "sk-key", AiProvider.OpenAI, "gpt-4o");
        encryptionService.Encrypt("sk-key").Returns(Result.Success("encrypted-key"));

        var result = await sut.UpdateAsync(input);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.UserId.Should().Be(currentUserId);
        result.Value.BaseUrl.Should().Be("https://api.openai.com/v1");
        result.Value.ApiKeyEncrypted.Should().Be("encrypted-key");
        result.Value.Provider.Should().Be(AiProvider.OpenAI);
        result.Value.ModelId.Should().Be("gpt-4o");
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task UpdateAsync_WhenApiKeyIsNull_ShouldNotCallEncryptAndPreserveExistingKey()
    {
        var existing = CreateSettings();
        settingsRepository.GetByUserForUpdateAsync(currentUserId).Returns(Success(existing));

        var input = new UpdateAiSettingsInput("https://new-api.com/v1", null, AiProvider.OpenAI, "gpt-4o");

        var result = await sut.UpdateAsync(input);

        result.Status.Should().Be(ResultStatus.Ok);
        existing.ApiKeyEncrypted.Should().Be("encrypted-key");
        existing.BaseUrl.Should().Be("https://new-api.com/v1");
        encryptionService.DidNotReceive().Encrypt(Arg.Any<string>());
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task UpdateAsync_WhenEncryptionFails_ShouldReturnErrorWithoutSaving()
    {
        settingsRepository.GetByUserForUpdateAsync(currentUserId).Returns(Success(CreateSettings()));

        var input = new UpdateAiSettingsInput("https://api.com/v1", "sk-key", AiProvider.OpenAI, "gpt-4o");
        encryptionService.Encrypt("sk-key").Returns(Result<string>.Error("Encryption failed"));

        var result = await sut.UpdateAsync(input);

        result.Status.Should().Be(ResultStatus.Error);
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task UpdateAsync_ShouldClearTestResults()
    {
        var existing = CreateSettings(lastTestSuccess: true, lastTestLatencyMs: 200, lastTestError: null);
        settingsRepository.GetByUserForUpdateAsync(currentUserId).Returns(Success(existing));

        var input = new UpdateAiSettingsInput("https://api.com/v1", null, null, null);

        var result = await sut.UpdateAsync(input);

        result.Status.Should().Be(ResultStatus.Ok);
        existing.LastTestSuccess.Should().BeNull();
        existing.LastTestLatencyMs.Should().BeNull();
        existing.LastTestError.Should().BeNull();
    }

    [Test]
    public async Task UpdateAsync_WithPartialInput_ShouldOnlyUpdateProvidedFields()
    {
        var existing = CreateSettings();
        settingsRepository.GetByUserForUpdateAsync(currentUserId).Returns(Success(existing));

        var input = new UpdateAiSettingsInput(null, null, null, "gpt-4o-mini");

        var result = await sut.UpdateAsync(input);

        result.Status.Should().Be(ResultStatus.Ok);
        existing.BaseUrl.Should().Be("https://api.openai.com/v1");
        existing.ApiKeyEncrypted.Should().Be("encrypted-key");
        existing.Provider.Should().Be(AiProvider.OpenAI);
        existing.ModelId.Should().Be("gpt-4o-mini");
    }

    #endregion

    #region TestConnectionAsync

    [Test]
    public async Task TestConnectionAsync_WhenSettingsNotConfigured_ShouldReturnNotFound()
    {
        settingsRepository.GetByUserAsync(currentUserId).Returns(NotFound<UserAiSettings>());

        var result = await sut.TestConnectionAsync();

        result.Status.Should().Be(ResultStatus.NotFound);
        await aiService.DidNotReceive()
            .TestConnectionAsync(Arg.Any<UserAiSettings>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task TestConnectionAsync_WhenConnectionSucceeds_ShouldPersistAndReturnTestResults()
    {
        var settings = CreateSettings();
        settingsRepository.GetByUserAsync(currentUserId).Returns(Success(settings));

        var tested = CreateSettings(lastTestSuccess: true, lastTestLatencyMs: 150);
        aiService.TestConnectionAsync(settings, Arg.Any<CancellationToken>())
            .Returns(Success(tested));

        var result = await sut.TestConnectionAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Success.Should().BeTrue();
        result.Value.LatencyMs.Should().Be(150);
        result.Value.ErrorMessage.Should().BeNull();
        await settingsRepository.Received(1).UpsertAsync(tested);
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task TestConnectionAsync_WhenConnectionFails_ShouldPersistFailureAndReturnResult()
    {
        var settings = CreateSettings();
        settingsRepository.GetByUserAsync(currentUserId).Returns(Success(settings));

        var tested = CreateSettings(lastTestSuccess: false, lastTestLatencyMs: null, lastTestError: "Connection refused");
        aiService.TestConnectionAsync(settings, Arg.Any<CancellationToken>())
            .Returns(Success(tested));

        var result = await sut.TestConnectionAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Success.Should().BeFalse();
        result.Value.LatencyMs.Should().BeNull();
        result.Value.ErrorMessage.Should().Be("Connection refused");
        await settingsRepository.Received(1).UpsertAsync(tested);
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task TestConnectionAsync_WhenAiServiceReturnsError_ShouldPropagateWithoutPersisting()
    {
        var settings = CreateSettings();
        settingsRepository.GetByUserAsync(currentUserId).Returns(Success(settings));
        aiService.TestConnectionAsync(settings, Arg.Any<CancellationToken>())
            .Returns(Error<UserAiSettings>());

        var result = await sut.TestConnectionAsync();

        result.Status.Should().Be(ResultStatus.Error);
        await settingsRepository.DidNotReceive().UpsertAsync(Arg.Any<UserAiSettings>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    #endregion

    private void ConfigureDefaults()
    {
        unitOfWork.SaveChangesAsync().Returns(SuccessResult());
        settingsRepository.GetByUserAsync(Arg.Any<Guid>()).Returns(NotFound<UserAiSettings>());
        settingsRepository.GetByUserForUpdateAsync(Arg.Any<Guid>()).Returns(NotFound<UserAiSettings>());
        settingsRepository.UpsertAsync(Arg.Any<UserAiSettings>()).Returns(SuccessResult());
        encryptionService.Encrypt(Arg.Any<string>()).Returns(Result.Success("encrypted-default"));
    }

    private UserAiSettings CreateSettings(
        bool? lastTestSuccess = null,
        int? lastTestLatencyMs = null,
        string? lastTestError = null)
    {
        return new UserAiSettings(
            currentUserId,
            "https://api.openai.com/v1",
            "encrypted-key",
            AiProvider.OpenAI,
            "gpt-4o",
            lastTestSuccess,
            lastTestLatencyMs,
            lastTestError);
    }

    private static Task<Result> SuccessResult()
    {
        return Task.FromResult(Result.Success());
    }

    private static Task<Result<T>> Success<T>(T value)
    {
        return Task.FromResult(Result.Success(value));
    }

    private static Task<Result<T>> NotFound<T>()
    {
        return Task.FromResult(Result<T>.NotFound());
    }

    private static Task<Result<T>> Error<T>()
    {
        return Task.FromResult(Result<T>.Error());
    }
}
