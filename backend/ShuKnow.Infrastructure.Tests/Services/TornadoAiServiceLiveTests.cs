using Ardalis.Result;
using AwesomeAssertions;
using dotenv.net;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using ShuKnow.Application.Common;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Enums;
using ShuKnow.Infrastructure.Services;

namespace ShuKnow.Infrastructure.Tests.Services;

[Category("Live")]
public class TornadoAiServiceLiveTests
{
    private const string ApiKeyEnvVar = "TORNADO_AI_TEST_API_KEY";
    private const string ProviderEnvVar = "TORNADO_AI_TEST_PROVIDER";
    private const string ModelEnvVar = "TORNADO_AI_TEST_MODEL";
    private const string BaseUrlEnvVar = "TORNADO_AI_TEST_BASE_URL";
    private const string EncryptionKey = "live-test-encryption-key";

    [Test]
    public async Task ProcessMessageAsync_WhenLiveSettingsConfigured_ShouldPersistUserAndAiMessages()
    {
        var config = LoadConfigurationOrIgnore();
        var fixture = CreateFixture(config, []);

        var result = await fixture.Service.ProcessMessageAsync(
            "Коротко представься одним предложением без markdown.",
            attachmentIds: null);

        result.Status.Should().Be(ResultStatus.Ok);
        fixture.PersistedMessages.Should().HaveCount(2);
        fixture.PersistedMessages[0].Role.Should().Be(ChatMessageRole.User);
        fixture.PersistedMessages[0].Content.Should().Be("Коротко представься одним предложением без markdown.");
        fixture.PersistedMessages[1].Role.Should().Be(ChatMessageRole.Ai);
        fixture.PersistedMessages[1].Content.Should().NotBeNullOrWhiteSpace();
    }

    [Test]
    public async Task ProcessMessageAsync_WhenAttachmentsProvided_ShouldLoadAttachmentMetadataAndPersistConversation()
    {
        var config = LoadConfigurationOrIgnore();
        var attachmentId = Guid.NewGuid();
        var attachment = new ChatAttachment(
            attachmentId,
            Guid.NewGuid(),
            "notes.txt",
            "text/plain",
            128);

        var fixture = CreateFixture(config, [attachment]);

        var result = await fixture.Service.ProcessMessageAsync(
            "Подтверди, что получил описание вложения, одним коротким предложением.",
            [attachmentId]);

        result.Status.Should().Be(ResultStatus.Ok);
        await fixture.AttachmentService.Received(1).GetByIdsAsync(
            Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Count == 1 && ids.Contains(attachmentId)),
            Arg.Any<CancellationToken>());
        fixture.PersistedMessages.Should().HaveCount(2);
        fixture.PersistedMessages[1].Role.Should().Be(ChatMessageRole.Ai);
        fixture.PersistedMessages[1].Content.Should().NotBeNullOrWhiteSpace();
    }

    private static TornadoAiFixture CreateFixture(
        TornadoAiLiveTestConfig config,
        IReadOnlyList<ChatAttachment> attachments)
    {
        var attachmentService = Substitute.For<IAttachmentService>();
        attachmentService.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(Result.Success<IReadOnlyList<ChatAttachment>>(attachments));

        var settingsService = Substitute.For<ISettingsService>();
        var encryptionService = new EncryptionService(
            Options.Create(new EncryptionOptions { Key = EncryptionKey }));
        var encryptedApiKey = encryptionService.Encrypt(config.ApiKey).Value;
        var settings = new UserAiSettings(
            Guid.NewGuid(),
            config.BaseUrl ?? string.Empty,
            encryptedApiKey,
            config.Provider,
            config.ModelId);

        settingsService.GetOrCreateAsync(Arg.Any<CancellationToken>())
            .Returns(Result.Success(settings));

        var chatService = Substitute.For<IChatService>();
        var session = new ChatSession(Guid.NewGuid(), Guid.NewGuid());
        var persistedMessages = new List<ChatMessage>();

        chatService.GetOrCreateActiveSessionAsync(Arg.Any<CancellationToken>())
            .Returns(Result.Success(session));
        chatService.GetMessagesAsync(Arg.Any<CancellationToken>())
            .Returns(Result.Success<IReadOnlyList<ChatMessage>>([]));
        chatService.PersistMessageAsync(Arg.Any<ChatMessage>(), Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                var message = callInfo.Arg<ChatMessage>();
                persistedMessages.Add(message);
                return Result.Success(message);
            });

        var toolsService = Substitute.For<IAiToolsService>();
        toolsService.CreateFolderAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => Result.Success($"created folder {callInfo.ArgAt<string>(0)}"));
        toolsService.CreateTextFileAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => Result.Success($"created file {callInfo.ArgAt<string>(0)}"));

        var service = new TornadoAiService(
            attachmentService,
            settingsService,
            encryptionService,
            chatService,
            toolsService,
            NullLogger<TornadoAiService>.Instance);

        return new TornadoAiFixture(service, attachmentService, persistedMessages);
    }

    private static TornadoAiLiveTestConfig LoadConfigurationOrIgnore()
    {
        DotEnv.Load(new DotEnvOptions(probeForEnv: true, probeLevelsToSearch: 8));

        var apiKey = Environment.GetEnvironmentVariable(ApiKeyEnvVar);
        var providerRaw = Environment.GetEnvironmentVariable(ProviderEnvVar);
        var modelId = Environment.GetEnvironmentVariable(ModelEnvVar);
        var baseUrl = Environment.GetEnvironmentVariable(BaseUrlEnvVar);

        if (string.IsNullOrWhiteSpace(apiKey) 
            || string.IsNullOrWhiteSpace(providerRaw) 
            || string.IsNullOrWhiteSpace(modelId))
        {
            Assert.Ignore(
                $"Live Tornado AI test skipped. Set {ApiKeyEnvVar}, {ProviderEnvVar}, and {ModelEnvVar} in the environment or .env file.");
        }

        if (!Enum.TryParse<AiProvider>(providerRaw, ignoreCase: true, out var provider) 
            || provider == AiProvider.Unknown)
        {
            Assert.Ignore(
                $"Live Tornado AI test skipped. {ProviderEnvVar} is incorrect enum value");
        }

        return new TornadoAiLiveTestConfig(apiKey, provider, modelId!, baseUrl);
    }

    private record TornadoAiLiveTestConfig(
        string ApiKey,
        AiProvider Provider,
        string ModelId,
        string? BaseUrl);

    private record TornadoAiFixture(
        TornadoAiService Service,
        IAttachmentService AttachmentService,
        List<ChatMessage> PersistedMessages);
}
