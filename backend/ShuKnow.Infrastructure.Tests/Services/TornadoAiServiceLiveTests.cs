using Ardalis.Result;
using AwesomeAssertions;
using dotenv.net;
using Microsoft.Extensions.Logging;
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
        const string prompt = "Коротко представься без markdown и перечисли доступные tools с сигнатурами.";

        var result = await fixture.Service.ProcessMessageAsync(
            prompt,
            attachmentIds: null,
            fixture.Settings);

        AssertResultOk(result, fixture.Logs);
        fixture.PersistedMessages.Should().HaveCount(2);
        fixture.PersistedMessages[0].Role.Should().Be(ChatMessageRole.User);
        fixture.PersistedMessages[0].Content.Should().Be(prompt);
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
            [attachmentId],
            fixture.Settings);

        AssertResultOk(result, fixture.Logs);
        await fixture.AttachmentService.Received(1).GetByIdsAsync(
            Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Count == 1 && ids.Contains(attachmentId)),
            Arg.Any<CancellationToken>());
        fixture.PersistedMessages.Should().HaveCount(2);
        fixture.PersistedMessages[1].Role.Should().Be(ChatMessageRole.Ai);
        fixture.PersistedMessages[1].Content.Should().NotBeNullOrWhiteSpace();
    }

    private static void AssertResultOk(Result result, IReadOnlyList<string> logs)
    {
        if (result.Status != ResultStatus.Ok)
        {
            var errors = string.Join("; ", result.Errors);
            var logOutput = string.Join(Environment.NewLine, logs);
            Assert.Fail($"Result status is {result.Status}. Errors: {errors}. Logs:{Environment.NewLine}{logOutput}");
        }
    }

    private static TornadoAiFixture CreateFixture(
        TornadoAiLiveTestConfig config,
        IReadOnlyList<ChatAttachment> attachments)
    {
        var attachmentService = Substitute.For<IAttachmentService>();
        attachmentService.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(Result.Success(attachments));
        
        var encryptionService = new EncryptionService(
            Options.Create(new EncryptionOptions { Key = EncryptionKey }));
        var encryptedApiKey = encryptionService.Encrypt(config.ApiKey).Value;
        var settings = new UserAiSettings(
            Guid.NewGuid(),
            config.BaseUrl ?? string.Empty,
            encryptedApiKey,
            config.Provider,
            config.ModelId);

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

        var promptBuilder = new TornadoPromptBuilder(attachmentService, chatService);
        var tornadoToolsService = new TornadoToolsService(toolsService);
        var testLogger = new TestLogger<TornadoAiService>();

        var service = new TornadoAiService(
            promptBuilder,
            encryptionService,
            chatService,
            tornadoToolsService,
            testLogger);

        return new TornadoAiFixture(service, settings, attachmentService, persistedMessages, testLogger.Logs);
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
        UserAiSettings Settings,
        IAttachmentService AttachmentService,
        List<ChatMessage> PersistedMessages,
        List<string> Logs);

    private class TestLogger<T> : ILogger<T>
    {
        public List<string> Logs { get; } = [];

        public IDisposable BeginScope<TState>(TState state) where TState : notnull => null!;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            var message = $"[{logLevel}] {formatter(state, exception)}";
            if (exception is not null)
                message += $"{Environment.NewLine}{exception}";
            Logs.Add(message);
        }
    }
}
