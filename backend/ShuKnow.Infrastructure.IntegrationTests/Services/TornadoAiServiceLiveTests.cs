using Ardalis.Result;
using AwesomeAssertions;
using dotenv.net;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NSubstitute;
using ShuKnow.Application.Common;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;
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

    #region ProcessMessageAsync

    [Test]
    public async Task ProcessMessageAsync_WhenLiveSettingsConfigured_ShouldReturnSuccess()
    {
        var fixture = CreateFixture(attachments: []);
        const string prompt = "Ответь одним словом: да.";

        var result = await fixture.Sut.ProcessMessageAsync(prompt, attachmentIds: null, settings: fixture.Settings, operationId: Guid.NewGuid());

        AssertSuccess(result, fixture.Logs);
    }

    [Test]
    public async Task ProcessMessageAsync_WhenLiveSettingsConfigured_ShouldPersistUserMessage()
    {
        var fixture = CreateFixture(attachments: []);
        const string prompt = "Ответь одним словом: да.";

        var result = await fixture.Sut.ProcessMessageAsync(prompt, attachmentIds: null, settings: fixture.Settings, operationId: Guid.NewGuid());
        
        AssertSuccess(result, fixture.Logs);
        fixture.PersistedMessages.Should().Contain(m =>
            m.Role == ChatMessageRole.User &&
            m.Content == prompt);
    }

    [Test]
    public async Task ProcessMessageAsync_WhenLiveSettingsConfigured_ShouldPersistAiResponse()
    {
        var fixture = CreateFixture(attachments: []);
        const string prompt = "Ответь одним словом: да.";

        var result = await fixture.Sut.ProcessMessageAsync(prompt, attachmentIds: null, settings: fixture.Settings, operationId: Guid.NewGuid());
        
        AssertSuccess(result, fixture.Logs);
        fixture.PersistedMessages.Should().Contain(m =>
            m.Role == ChatMessageRole.Ai &&
            !string.IsNullOrWhiteSpace(m.Content));
    }

    [Test]
    public async Task ProcessMessageAsync_WhenToolsDescriptionRequested_ShouldReturnToolsList()
    {
        var fixture = CreateFixture(attachments: []);
        const string prompt = "Коротко представься без markdown и перечисли доступные tools с сигнатурами.";

        var result = await fixture.Sut.ProcessMessageAsync(prompt, attachmentIds: null, settings: fixture.Settings, operationId: Guid.NewGuid());

        AssertSuccess(result, fixture.Logs);
        fixture.PersistedMessages.Should().HaveCount(2);
        fixture.PersistedMessages[1].Content.Should().NotBeNullOrWhiteSpace();
    }

    [Test]
    public async Task ProcessMessageAsync_WhenAttachmentsProvided_ShouldLoadAttachmentMetadata()
    {
        var attachmentId = Guid.NewGuid();
        var attachment = CreateTextAttachment(attachmentId, "notes.txt");
        var fixture = CreateFixture([attachment]);

        var result = await fixture.Sut.ProcessMessageAsync(
            "Подтверди, что получил описание вложения, одним коротким предложением.",
            [attachmentId],
            fixture.Settings, Guid.NewGuid());
        
        AssertSuccess(result, fixture.Logs);
        await fixture.AttachmentService.Received(1).GetByIdsAsync(
            Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.SequenceEqual(new[] { attachmentId })),
            Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenAttachmentsProvided_ShouldLoadBlobData()
    {
        var attachmentId = Guid.NewGuid();
        var attachment = CreateTextAttachment(attachmentId, "notes.txt");
        var fixture = CreateFixture([attachment]);

        var result = await fixture.Sut.ProcessMessageAsync(
            "Подтверди, что получил описание вложения, одним коротким предложением.",
            [attachmentId],
            fixture.Settings, Guid.NewGuid());
        
        AssertSuccess(result, fixture.Logs);
        await fixture.BlobStorageService.Received(1).GetAsync(attachment.BlobId, Arg.Any<CancellationToken>());
    }

    #endregion

    #region Tool Calls - Error Handling

    [Test]
    public async Task ProcessMessageAsync_WhenMoveFileFailsWithNotFound_ShouldHandleGracefully()
    {
        var fixture = CreateFixtureWithToolErrors();
        const string prompt = "Перемести файл 'nonexistent.txt' в папку 'destination/'.";

        var result = await fixture.Sut.ProcessMessageAsync(prompt, attachmentIds: null, settings: fixture.Settings, operationId: Guid.NewGuid());

        AssertSuccess(result, fixture.Logs);
        await fixture.AiToolsService.Received().MoveFileAsync(
            Arg.Any<string>(),
            Arg.Any<string>(),
            Arg.Any<CancellationToken>());
    }

    #endregion

    #region Tool Calls - Multi-Step

    [Test]
    public async Task ProcessMessageAsync_WhenMultipleToolCallsRequired_ShouldExecuteAllTools()
    {
        var fixture = CreateFixture(attachments: []);
        const string prompt = """
            Выполни следующие действия:
            1. Создай папку 'notes' с описанием 'My notes' и эмодзи 📝
            2. Создай в ней текстовый файл 'readme.txt' с содержимым 'Hello World'
            Подтверди выполнение кратко.
            """;

        var result = await fixture.Sut.ProcessMessageAsync(prompt, attachmentIds: null, settings: fixture.Settings, operationId: Guid.NewGuid());

        AssertSuccess(result, fixture.Logs);
        await fixture.AiToolsService.Received().CreateFolderAsync(
            Arg.Any<string>(),
            Arg.Any<string>(),
            Arg.Any<string>(),
            Arg.Any<CancellationToken>());
        await fixture.AiToolsService.Received().CreateTextFileAsync(
            Arg.Any<string>(),
            Arg.Any<string>(),
            Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenMultipleToolCallsRequired_ShouldPersistFinalResponse()
    {
        var fixture = CreateFixture(attachments: []);
        const string prompt = """
            Выполни следующие действия:
            1. Создай папку 'notes' с описанием 'My notes' и эмодзи 📝
            2. Создай в ней текстовый файл 'readme.txt' с содержимым 'Hello World'
            Подтверди выполнение кратко.
            """;

        var result = await fixture.Sut.ProcessMessageAsync(prompt, attachmentIds: null, settings: fixture.Settings, operationId: Guid.NewGuid());
        
        AssertSuccess(result, fixture.Logs);
        fixture.PersistedMessages[0].Role.Should().Be(ChatMessageRole.User);
        fixture.PersistedMessages[1].Role.Should().Be(ChatMessageRole.Ai);
        fixture.PersistedMessages[1].Content.Should().NotBeNullOrWhiteSpace();
    }

    [Test]
    public async Task ProcessMessageAsync_WhenAppendAndPrependRequested_ShouldExecuteBothOperations()
    {
        var fixture = CreateFixture(attachments: []);
        const string prompt = """
            У меня есть файл 'document.txt'. 
            Добавь в начало текст 'HEADER: ' и в конец текст ' :FOOTER'.
            Подтверди кратко.
            """;

        var result = await fixture.Sut.ProcessMessageAsync(prompt, attachmentIds: null, settings: fixture.Settings, operationId: Guid.NewGuid());

        AssertSuccess(result, fixture.Logs);
        await fixture.AiToolsService.Received().PrependTextAsync(
            Arg.Any<string>(),
            Arg.Any<string>(),
            Arg.Any<CancellationToken>());
        await fixture.AiToolsService.Received().AppendTextAsync(
            Arg.Any<string>(),
            Arg.Any<string>(),
            Arg.Any<CancellationToken>());
    }

    #endregion

    #region TestConnectionAsync

    [Test]
    public async Task TestConnectionAsync_WhenLiveSettingsConfigured_ShouldReturnSuccessWithLatency()
    {
        var fixture = CreateFixture(attachments: []);

        var result = await fixture.Sut.TestConnectionAsync(fixture.Settings);

        result.Should().BeSameAs(fixture.Settings);
        if (result.LastTestSuccess != true)
        {
            var logOutput = fixture.Logs.Count == 0 ? "<no logs>" : string.Join(Environment.NewLine, fixture.Logs);
            Assert.Fail($"Connection test failed. Error: {result.LastTestError}. Logs:{Environment.NewLine}{logOutput}");
        }
        
        result.LastTestLatencyMs.Should().NotBeNull();
        result.LastTestLatencyMs.Should().BeGreaterThan(0);
        result.LastTestError.Should().BeNull();
    }

    [Test]
    public async Task TestConnectionAsync_WhenInvalidApiKey_ShouldReturnFailure()
    {
        var fixture = CreateFixture(attachments: []);
        var invalidSettings = CreateInvalidSettings(fixture.Settings);

        var result = await fixture.Sut.TestConnectionAsync(invalidSettings);

        result.LastTestSuccess.Should().BeFalse();
        result.LastTestError.Should().NotBeNull();
    }

    #endregion

    #region Fixture Setup

    private static TornadoAiLiveFixture CreateFixture(IReadOnlyList<ChatAttachment> attachments)
    {
        return CreateFixtureCore(attachments, CreateMockAiToolsService());
    }

    private static TornadoAiLiveFixture CreateFixtureWithToolErrors()
    {
        return CreateFixtureCore([], CreateMockAiToolsServiceWithErrors());
    }

    private static TornadoAiLiveFixture CreateFixtureCore(
        IReadOnlyList<ChatAttachment> attachments,
        IAiToolsService aiToolsService)
    {
        var config = LoadConfigurationOrIgnore();

        var attachmentService = Substitute.For<IAttachmentService>();
        attachmentService.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<IReadOnlyList<ChatAttachment>>(attachments)));
        attachmentService.MarkConsumedAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success()));

        var blobStorageService = Substitute.For<IBlobStorageService>();
        blobStorageService.GetAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<Stream>(new MemoryStream([1, 2, 3]))));

        var notificationService = Substitute.For<IChatNotificationService>();
        notificationService.SendMessageChunkAsync(Arg.Any<Guid>(), Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);
        notificationService.SendMessageCompletedAsync(Arg.Any<Guid>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);

        var encryptionService = new EncryptionService(Options.Create(new EncryptionOptions { Key = EncryptionKey }));
        var encryptedApiKey = encryptionService.Encrypt(config.ApiKey).Value;
        var settings = new UserAiSettings(
            Guid.NewGuid(),
            config.BaseUrl ?? string.Empty,
            encryptedApiKey,
            config.Provider,
            config.ModelId);

        var chatService = Substitute.For<IChatService>();
        var folderService = Substitute.For<IFolderService>();
        var session = new ChatSession(Guid.NewGuid(), Guid.NewGuid());
        var persistedMessages = new List<ChatMessage>();

        chatService.GetOrCreateActiveSessionAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success(session)));
        chatService.GetMessagesAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<IReadOnlyCollection<ChatMessage>>([])));
        folderService.GetFolderTreeForPromptAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<IReadOnlyList<FolderSummary>>([])));
        chatService.PersistMessageAsync(Arg.Any<ChatMessage>(), Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                var message = callInfo.Arg<ChatMessage>();
                persistedMessages.Add(message);
                return Task.FromResult(Result.Success(message));
            });
        chatService.PersistMessagesAsync(Arg.Any<IReadOnlyCollection<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                persistedMessages.AddRange(callInfo.Arg<IReadOnlyCollection<ChatMessage>>());
                return Task.FromResult(Result.Success());
            });

        var options = Options.Create(new TornadoAiOptions { Temperature = 0.3, MaxTurns = 10 });
        var promptBuilder = new TornadoPromptBuilder(
            folderService,
            attachmentService,
            blobStorageService,
            chatService,
            options);
        var toolsService = new TornadoToolsService(aiToolsService);
        var conversationFactory = new TornadoConversationFactory(encryptionService);
        var logger = new TestLogger<TornadoAiService>();
        var sut = new TornadoAiService(
            promptBuilder,
            attachmentService,
            chatService,
            toolsService,
            notificationService,
            conversationFactory,
            options,
            logger);

        return new TornadoAiLiveFixture(
            sut,
            settings,
            attachmentService,
            blobStorageService,
            aiToolsService,
            persistedMessages,
            logger.Logs);
    }

    private static IAiToolsService CreateMockAiToolsService()
    {
        var service = Substitute.For<IAiToolsService>();

        service.CreateFolderAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => Task.FromResult(Result.Success($"created folder {callInfo.ArgAt<string>(0)}")));
        service.CreateTextFileAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => Task.FromResult(Result.Success($"created file {callInfo.ArgAt<string>(0)}")));
        service.SaveAttachment(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => Task.FromResult(Result.Success($"saved attachment {callInfo.ArgAt<string>(0)}")));
        service.AppendTextAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => Task.FromResult(Result.Success($"appended text to {callInfo.ArgAt<string>(0)}")));
        service.PrependTextAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => Task.FromResult(Result.Success($"prepended text to {callInfo.ArgAt<string>(0)}")));
        service.MoveFileAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => Task.FromResult(Result.Success($"moved file to {callInfo.ArgAt<string>(1)}")));

        return service;
    }

    private static IAiToolsService CreateMockAiToolsServiceWithErrors()
    {
        var service = Substitute.For<IAiToolsService>();

        service.CreateFolderAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<string>.Error("Invalid path: folder name contains invalid characters")));
        service.CreateTextFileAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<string>.Error("Invalid path: file already exists")));
        service.SaveAttachment(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<string>.Error("Attachment not found")));
        service.AppendTextAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<string>.Error("File not found: cannot append to non-existent file")));
        service.PrependTextAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<string>.Error("File not found: cannot prepend to non-existent file")));
        service.MoveFileAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<string>.Error("Source file not found")));

        return service;
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

    #endregion

    #region Helpers

    private static void AssertSuccess(Result result, IReadOnlyList<string> logs)
    {
        if (result.Status == ResultStatus.Ok)
            return;

        var errors = string.Join("; ", result.Errors);
        var logOutput = logs.Count == 0 ? "<no logs>" : string.Join(Environment.NewLine, logs);
        Assert.Fail($"Result status is {result.Status}. Errors: {errors}. Logs:{Environment.NewLine}{logOutput}");
    }

    private static ChatAttachment CreateTextAttachment(Guid attachmentId, string fileName)
    {
        return new ChatAttachment(attachmentId, Guid.NewGuid(), Guid.NewGuid(), fileName, "text/plain", 128);
    }

    private static UserAiSettings CreateInvalidSettings(UserAiSettings validSettings)
    {
        var encryptionService = new EncryptionService(Options.Create(new EncryptionOptions { Key = EncryptionKey }));
        var encryptedInvalidKey = encryptionService.Encrypt("invalid-api-key").Value;

        return new UserAiSettings(
            Guid.NewGuid(),
            validSettings.BaseUrl ?? string.Empty,
            encryptedInvalidKey,
            validSettings.Provider,
            validSettings.ModelId);
    }

    #endregion

    #region Types

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
        IAiToolsService AiToolsService,
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

    #endregion
}
