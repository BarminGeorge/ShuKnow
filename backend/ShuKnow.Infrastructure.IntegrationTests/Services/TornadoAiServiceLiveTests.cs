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

namespace ShuKnow.Infrastructure.IntegrationTests.Services;

[TestFixture]
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
        var fixture = CreateFixture(attachments: []);
        const string prompt = "Коротко представься без markdown и перечисли доступные tools с сигнатурами.";

        var result = await fixture.Sut.ProcessMessageAsync(prompt, attachmentIds: null, fixture.Settings);

        AssertSuccess(result, fixture.Logs);
        fixture.PersistedMessages.Should().HaveCount(2);
        fixture.PersistedMessages[0].Role.Should().Be(ChatMessageRole.User);
        fixture.PersistedMessages[0].Content.Should().Be(prompt);
        fixture.PersistedMessages[1].Role.Should().Be(ChatMessageRole.Ai);
        fixture.PersistedMessages[1].Content.Should().NotBeNullOrWhiteSpace();
    }

    [Test]
    public async Task ProcessMessageAsync_WhenAttachmentsProvided_ShouldLoadAttachmentMetadataAndPersistConversation()
    {
        var attachmentId = Guid.NewGuid();
        var attachment = new ChatAttachment(
            attachmentId,
            Guid.NewGuid(),
            "notes.txt",
            "text/plain",
            128)
        {
            BlobId = Guid.NewGuid()
        };
        var fixture = CreateFixture([attachment]);

        var result = await fixture.Sut.ProcessMessageAsync(
            "Подтверди, что получил описание вложения, одним коротким предложением.",
            [attachmentId],
            fixture.Settings);

        AssertSuccess(result, fixture.Logs);
        await fixture.AttachmentService.Received(1).GetByIdsAsync(
            Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.SequenceEqual(new[] { attachmentId })),
            Arg.Any<CancellationToken>());
        await fixture.BlobStorageService.DidNotReceive().GetAsync(attachment.BlobId, Arg.Any<CancellationToken>());
        fixture.PersistedMessages.Should().HaveCount(2);
        fixture.PersistedMessages[1].Role.Should().Be(ChatMessageRole.Ai);
        fixture.PersistedMessages[1].Content.Should().NotBeNullOrWhiteSpace();
    }

    private static void AssertSuccess(Result result, IReadOnlyList<string> logs)
    {
        if (result.Status == ResultStatus.Ok)
            return;

        var errors = string.Join("; ", result.Errors);
        var logOutput = logs.Count == 0 ? "<no logs>" : string.Join(Environment.NewLine, logs);
        Assert.Fail($"Result status is {result.Status}. Errors: {errors}. Logs:{Environment.NewLine}{logOutput}");
    }

    private static TornadoAiLiveFixture CreateFixture(IReadOnlyList<ChatAttachment> attachments)
    {
        var config = LoadConfigurationOrIgnore();
        var attachmentService = Substitute.For<IAttachmentService>();
        attachmentService.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<IReadOnlyList<ChatAttachment>>(attachments)));

        var blobStorageService = Substitute.For<IBlobStorageService>();
        blobStorageService.GetAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<Stream>(new MemoryStream([1, 2, 3]))));

        var encryptionService = new EncryptionService(Options.Create(new EncryptionOptions { Key = EncryptionKey }));
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
            .Returns(Task.FromResult(Result.Success(session)));
        chatService.GetMessagesAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<IReadOnlyList<ChatMessage>>([])));
        chatService.PersistMessageAsync(Arg.Any<ChatMessage>(), Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                var message = callInfo.Arg<ChatMessage>();
                persistedMessages.Add(message);
                return Task.FromResult(Result.Success(message));
            });

        var aiToolsService = Substitute.For<IAiToolsService>();
        aiToolsService.CreateFolderAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => Task.FromResult(Result.Success($"created folder {callInfo.ArgAt<string>(0)}")));
        aiToolsService.CreateTextFileAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => Task.FromResult(Result.Success($"created file {callInfo.ArgAt<string>(0)}")));
        aiToolsService.SaveAttachment(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => Task.FromResult(Result.Success($"saved attachment {callInfo.ArgAt<string>(0)}")));
        aiToolsService.AppendTextAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => Task.FromResult(Result.Success($"appended text to {callInfo.ArgAt<string>(0)}")));
        aiToolsService.PrependTextAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => Task.FromResult(Result.Success($"prepended text to {callInfo.ArgAt<string>(0)}")));
        aiToolsService.MoveFileAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => Task.FromResult(Result.Success($"moved file to {callInfo.ArgAt<string>(1)}")));

        var promptBuilder = new TornadoPromptBuilder(attachmentService, blobStorageService, chatService);
        var toolsService = new TornadoToolsService(aiToolsService);
        var conversationFactory = new TornadoConversationFactory(encryptionService);
        var logger = new TestLogger<TornadoAiService>();
        var sut = new TornadoAiService(promptBuilder, chatService, toolsService, conversationFactory, logger);

        return new TornadoAiLiveFixture(
            sut,
            settings,
            attachmentService,
            blobStorageService,
            persistedMessages,
            logger.Logs);
    }

    private static TornadoAiLiveConfiguration LoadConfigurationOrIgnore()
    {
        DotEnv.Load(new DotEnvOptions(probeForEnv: true, probeLevelsToSearch: 8));

        var apiKey = Environment.GetEnvironmentVariable(ApiKeyEnvVar);
        var providerRaw = Environment.GetEnvironmentVariable(ProviderEnvVar);
        var modelId = Environment.GetEnvironmentVariable(ModelEnvVar);
        var baseUrl = Environment.GetEnvironmentVariable(BaseUrlEnvVar);

        if (string.IsNullOrWhiteSpace(apiKey) ||
            string.IsNullOrWhiteSpace(providerRaw) ||
            string.IsNullOrWhiteSpace(modelId))
        {
            Assert.Ignore(
                $"Live Tornado AI test skipped. Set {ApiKeyEnvVar}, {ProviderEnvVar}, and {ModelEnvVar} in the environment or .env file.");
        }

        if (!Enum.TryParse<AiProvider>(providerRaw, ignoreCase: true, out var provider) ||
            provider == AiProvider.Unknown)
        {
            Assert.Ignore($"Live Tornado AI test skipped. {ProviderEnvVar} is incorrect enum value.");
        }

        return new TornadoAiLiveConfiguration(apiKey!, provider, modelId!, baseUrl);
    }

    private sealed record TornadoAiLiveConfiguration(
        string ApiKey,
        AiProvider Provider,
        string ModelId,
        string? BaseUrl);

    private sealed record TornadoAiLiveFixture(
        TornadoAiService Sut,
        UserAiSettings Settings,
        IAttachmentService AttachmentService,
        IBlobStorageService BlobStorageService,
        List<ChatMessage> PersistedMessages,
        List<string> Logs);

    private sealed class TestLogger<T> : ILogger<T>
    {
        public List<string> Logs { get; } = [];

        public IDisposable BeginScope<TState>(TState state) where TState : notnull
        {
            return NullScope.Instance;
        }

        public bool IsEnabled(LogLevel logLevel)
        {
            return true;
        }

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            var message = $"[{logLevel}] {formatter(state, exception)}";
            if (exception is not null)
                message += $"{Environment.NewLine}{exception}";

            Logs.Add(message);
        }

        private sealed class NullScope : IDisposable
        {
            public static NullScope Instance { get; } = new();

            public void Dispose()
            {
            }
        }
    }
}
