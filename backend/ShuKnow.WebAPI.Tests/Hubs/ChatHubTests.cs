using Ardalis.Result;
using AwesomeAssertions;
using Microsoft.Extensions.Logging;
using NSubstitute;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;
using ShuKnow.Application.Models.Notifications;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Enums;
using ShuKnow.WebAPI.Dto.Files;
using ShuKnow.WebAPI.Events;
using ShuKnow.WebAPI.Hubs;
using ResultExtensions = ShuKnow.Application.Extensions.ResultExtensions;
using ValidationError = ShuKnow.WebAPI.Events.ValidationError;

namespace ShuKnow.WebAPI.Tests.Hubs;

public class ChatHubTests
{
    private const string ConnectionId = "connection-42";

    private IAiService aiService = null!;
    private IChatNotificationService chatNotificationService = null!;
    private ISettingsService settingsService = null!;
    private IProcessingOperationService operationService = null!;
    private ICurrentConnectionService currentConnectionService = null!;
    private ILogger<ChatHub> logger = null!;
    private ChatHub sut = null!;

    [SetUp]
    public void SetUp()
    {
        aiService = Substitute.For<IAiService>();
        chatNotificationService = Substitute.For<IChatNotificationService>();
        settingsService = Substitute.For<ISettingsService>();
        operationService = Substitute.For<IProcessingOperationService>();
        currentConnectionService = Substitute.For<ICurrentConnectionService>();
        logger = Substitute.For<ILogger<ChatHub>>();

        currentConnectionService.connectionId.Returns(ConnectionId);

        sut = new ChatHub(
            aiService,
            chatNotificationService,
            settingsService,
            operationService,
            currentConnectionService,
            logger);
    }

    [TearDown]
    public void TearDown()
    {
        sut.Dispose();
    }

    [Test]
    public async Task SendMessage_WhenProcessingSucceeds_ShouldNotifyAndCompleteOperation()
    {
        var command = new SendMessageCommand("Sort these files", AttachmentIds: [Guid.NewGuid(), Guid.NewGuid()]);
        var operation = new ProcessingOperation(Guid.NewGuid(), new CancellationTokenSource());
        var settings = CreateSettings();

        operationService.BeginOperation(ConnectionId).Returns(operation);
        settingsService.GetOrCreateAsync(operation.CancellationTokenSource.Token)
            .Returns(Result.Success(settings));
        aiService.ProcessMessageAsync(
                command.Content,
                command.AttachmentIds,
                settings,
                operation.OperationId,
                operation.CancellationTokenSource.Token)
            .Returns(Result.Success());

        await sut.SendMessage(command);

        await chatNotificationService.Received(1)
            .SendProcessingStartedAsync(operation.OperationId, operation.CancellationTokenSource.Token);
        await aiService.Received(1).ProcessMessageAsync(
            command.Content,
            command.AttachmentIds,
            settings,
            operation.OperationId,
            operation.CancellationTokenSource.Token);
        await chatNotificationService.Received(1)
            .SendProcessingCompletedAsync(operation.OperationId, CancellationToken.None);
        operationService.Received(1).CompleteOperation(ConnectionId, operation.OperationId);
        await chatNotificationService.DidNotReceive()
            .SendProcessingFailedAsync(
                Arg.Any<Guid>(),
                Arg.Any<string>(),
                Arg.Any<ChatProcessingErrorCode>(),
                Arg.Any<CancellationToken>());

        operation.CancellationTokenSource.Dispose();
    }

    [Test]
    public async Task SendMessage_WhenProcessingFails_ShouldSendFailureAndCompleteOperation()
    {
        var command = new SendMessageCommand("Sort these files");
        var operation = new ProcessingOperation(Guid.NewGuid(), new CancellationTokenSource());
        var settings = CreateSettings();
        var processingResult = ResultExtensions.Invalid(
            "model returned invalid payload",
            ChatProcessingErrorCode.LlmInvalidResponse);

        operationService.BeginOperation(ConnectionId).Returns(operation);
        settingsService.GetOrCreateAsync(operation.CancellationTokenSource.Token)
            .Returns(Result.Success(settings));
        aiService.ProcessMessageAsync(
                command.Content,
                command.AttachmentIds,
                settings,
                operation.OperationId,
                operation.CancellationTokenSource.Token)
            .Returns(processingResult);

        await sut.SendMessage(command);

        await chatNotificationService.Received(1).SendProcessingStartedAsync(
            operation.OperationId,
            operation.CancellationTokenSource.Token);
        await chatNotificationService.Received(1).SendProcessingFailedAsync(
            operation.OperationId,
            "model returned invalid payload",
            ChatProcessingErrorCode.LlmInvalidResponse,
            operation.CancellationTokenSource.Token);
        await chatNotificationService.DidNotReceive()
            .SendProcessingCompletedAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        operationService.Received(1).CompleteOperation(ConnectionId, operation.OperationId);

        operation.CancellationTokenSource.Dispose();
    }

    [Test]
    public async Task SendMessage_WhenOperationIsCancelled_ShouldSwallowCancellationAndCompleteOperation()
    {
        var command = new SendMessageCommand("Sort these files");
        var operation = new ProcessingOperation(Guid.NewGuid(), new CancellationTokenSource());
        var settings = CreateSettings();

        operationService.BeginOperation(ConnectionId).Returns(operation);
        settingsService.GetOrCreateAsync(operation.CancellationTokenSource.Token)
            .Returns(Result.Success(settings));
        aiService.ProcessMessageAsync(
                command.Content,
                command.AttachmentIds,
                settings,
                operation.OperationId,
                operation.CancellationTokenSource.Token)
            .Returns(_ =>
            {
                operation.CancellationTokenSource.Cancel();
                return Task.FromException<Result>(
                    new OperationCanceledException(operation.CancellationTokenSource.Token));
            });

        var act = async () => await sut.SendMessage(command);

        await act.Should().NotThrowAsync();

        operationService.Received(1).CompleteOperation(ConnectionId, operation.OperationId);
        await chatNotificationService.DidNotReceive()
            .SendProcessingCompletedAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await chatNotificationService.DidNotReceive()
            .SendProcessingFailedAsync(
                Arg.Any<Guid>(),
                Arg.Any<string>(),
                Arg.Any<ChatProcessingErrorCode>(),
                Arg.Any<CancellationToken>());

        operation.CancellationTokenSource.Dispose();
    }

    [Test]
    public async Task SendMessage_WhenNonMatchingOperationCanceledExceptionIsThrown_ShouldPropagateAndCompleteOperation()
    {
        var command = new SendMessageCommand("Sort these files");
        var operation = new ProcessingOperation(Guid.NewGuid(), new CancellationTokenSource());
        var settings = CreateSettings();

        operationService.BeginOperation(ConnectionId).Returns(operation);
        settingsService.GetOrCreateAsync(operation.CancellationTokenSource.Token)
            .Returns(Result.Success(settings));
        aiService.ProcessMessageAsync(
                command.Content,
                command.AttachmentIds,
                settings,
                operation.OperationId,
                operation.CancellationTokenSource.Token)
            .Returns(_ => Task.FromException<Result>(new OperationCanceledException()));

        var act = async () => await sut.SendMessage(command);

        await act.Should().ThrowAsync<OperationCanceledException>();

        operationService.Received(1).CompleteOperation(ConnectionId, operation.OperationId);

        operation.CancellationTokenSource.Dispose();
    }

    [Test]
    public async Task CancelProcessing_ShouldCancelCurrentOperation()
    {
        await sut.CancelProcessing();

        operationService.Received(1).CancelOperation(ConnectionId);
    }

    [Test]
    public async Task OnDisconnectedAsync_ShouldCancelCurrentOperation()
    {
        await sut.OnDisconnectedAsync(null);

        operationService.Received(1).CancelOperation(ConnectionId);
    }

    [Test]
    public void ServerEventMethods_ShouldAcceptPayloadsWithoutThrowing()
    {
        var operationId = Guid.NewGuid();
        var messageId = Guid.NewGuid();

        var act = () =>
        {
            sut.OnValidationFailed(new ValidationFailedEvent(
                nameof(ChatHub.SendMessage),
                [new ValidationError("Content", "Content is required")]));
            sut.OnProcessingStarted(new ProcessingStartedEvent(operationId));
            sut.OnMessageChunk(new MessageChunkEvent(operationId, messageId, "chunk"));
            sut.OnMessageCompleted(new MessageCompletedEvent(operationId, messageId));
            sut.OnFileCreated(new FileDto(
                Guid.NewGuid(),
                Guid.NewGuid(),
                "Inbox",
                "file.txt",
                "description",
                "text/plain",
                12,
                1,
                "checksum",
                3,
                DateTimeOffset.UtcNow));
            sut.OnFileMoved(new FileMovedEvent(Guid.NewGuid(), "file.txt", Guid.NewGuid(), Guid.NewGuid()));
            sut.OnFolderCreated(new FolderCreatedEvent(Guid.NewGuid(), "Docs", "description", "D", Guid.NewGuid(), 2));
            sut.OnTextAppended(new TextAppendedEvent(Guid.NewGuid(), "tail"));
            sut.OnTextPrepended(new TextPrependedEvent(Guid.NewGuid(), "head"));
            sut.OnAttachmentSaved(new AttachmentSavedEvent(Guid.NewGuid(), "notes.txt", "text/plain", 42));
            sut.OnProcessingCompleted(new ProcessingCompletedEvent(operationId));
            sut.OnProcessingFailed(new ProcessingFailedEvent(operationId, "failure", ProcessingErrorCode.InternalError));
        };

        act.Should().NotThrow();
    }

    private static UserAiSettings CreateSettings()
    {
        return new UserAiSettings(
            Guid.NewGuid(),
            "https://api.example.test",
            "encrypted-key",
            AiProvider.OpenAI,
            "gpt-test");
    }
}
