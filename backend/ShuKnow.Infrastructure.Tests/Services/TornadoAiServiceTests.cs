using Ardalis.Result;
using AwesomeAssertions;
using LlmTornado.Chat;
using LlmTornado.ChatFunctions;
using LlmTornado.Code;
using LlmTornado.Common;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using ShuKnow.Application.Common;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models.Notifications;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Enums;
using ShuKnow.Infrastructure.Services;
using ChatMessage = ShuKnow.Domain.Entities.ChatMessage;
using TornadoChatMessage = LlmTornado.Chat.ChatMessage;

namespace ShuKnow.Infrastructure.Tests.Services;

public class TornadoAiServiceTests
{
    private IAttachmentService attachmentService = null!;
    private IBlobStorageService blobStorageService = null!;
    private IChatService chatService = null!;
    private IAiToolsService aiToolsService = null!;
    private IChatNotificationService notificationService = null!;
    private ITornadoConversationFactory conversationFactory = null!;
    private ITornadoConversation conversation = null!;
    private ILogger<TornadoAiService> logger = null!;
    private IOptions<TornadoAiOptions> options = null!;
    private TornadoAiService sut = null!;
    private ChatSession session = null!;
    private UserAiSettings settings = null!;
    private Guid operationId;

    [SetUp]
    public void SetUp()
    {
        attachmentService = Substitute.For<IAttachmentService>();
        blobStorageService = Substitute.For<IBlobStorageService>();
        chatService = Substitute.For<IChatService>();
        aiToolsService = Substitute.For<IAiToolsService>();
        notificationService = Substitute.For<IChatNotificationService>();
        conversationFactory = Substitute.For<ITornadoConversationFactory>();
        conversation = Substitute.For<ITornadoConversation>();
        logger = Substitute.For<ILogger<TornadoAiService>>();
        options = Options.Create(new TornadoAiOptions { Temperature = 0.3, MaxTurns = 10 });

        session = new ChatSession(Guid.NewGuid(), Guid.NewGuid());
        settings = CreateSettings();
        operationId = Guid.NewGuid();

        ConfigureDefaults();

        var promptBuilder = new TornadoPromptBuilder(attachmentService, blobStorageService, chatService);
        var toolsService = new TornadoToolsService(aiToolsService);
        sut = new TornadoAiService(
            promptBuilder,
            attachmentService,
            chatService,
            toolsService,
            notificationService,
            conversationFactory,
            options,
            logger);
    }

    #region ProcessMessageAsync - Session Handling

    [Test]
    public async Task ProcessMessageAsync_WhenActiveSessionLookupFails_ShouldReturnFailure()
    {
        chatService.GetOrCreateActiveSessionAsync(Arg.Any<CancellationToken>())
            .Returns(Error<ChatSession>("session failed"));

        var result = await sut.ProcessMessageAsync("hello", attachmentIds: null, settings: settings, operationId: operationId);

        result.Status.Should().Be(ResultStatus.Error);
        result.Errors.Should().ContainSingle().Which.Should().Be("session failed");
    }

    [Test]
    public async Task ProcessMessageAsync_WhenActiveSessionLookupFails_ShouldNotCreateConversation()
    {
        chatService.GetOrCreateActiveSessionAsync(Arg.Any<CancellationToken>())
            .Returns(Error<ChatSession>("session failed"));

        await sut.ProcessMessageAsync("hello", attachmentIds: null, settings: settings, operationId: operationId);

        conversationFactory.DidNotReceiveWithAnyArgs()
            .CreateConversation(default!, default!, default);
    }

    [Test]
    public async Task ProcessMessageAsync_WhenActiveSessionLookupFails_ShouldNotPersistMessages()
    {
        chatService.GetOrCreateActiveSessionAsync(Arg.Any<CancellationToken>())
            .Returns(Error<ChatSession>("session failed"));

        await sut.ProcessMessageAsync("hello", attachmentIds: null, settings: settings, operationId: operationId);

        await chatService.DidNotReceive()
            .PersistMessageAsync(Arg.Any<ChatMessage>(), Arg.Any<CancellationToken>());
    }

    #endregion

    #region ProcessMessageAsync - Conversation Creation

    [Test]
    public async Task ProcessMessageAsync_WhenConversationCreationFails_ShouldReturnFailure()
    {
        conversationFactory.CreateConversation(
                Arg.Any<UserAiSettings>(),
                Arg.Any<IReadOnlyCollection<Tool>>(),
                Arg.Any<double>())
            .Returns(Result<ITornadoConversation>.Error("API key is not configured"));

        var result = await sut.ProcessMessageAsync("hello", attachmentIds: null, settings: settings, operationId: operationId);

        result.Status.Should().Be(ResultStatus.Error);
        result.Errors.Should().ContainSingle().Which.Should().Be("API key is not configured");
    }

    [Test]
    public async Task ProcessMessageAsync_WhenConversationCreationFails_ShouldNotPersistMessages()
    {
        conversationFactory.CreateConversation(
                Arg.Any<UserAiSettings>(),
                Arg.Any<IReadOnlyCollection<Tool>>(),
                Arg.Any<double>())
            .Returns(Result<ITornadoConversation>.Error("API key is not configured"));

        await sut.ProcessMessageAsync("hello", attachmentIds: null, settings: settings, operationId: operationId);

        await chatService.DidNotReceive()
            .PersistMessageAsync(Arg.Any<ChatMessage>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_ShouldCreateConversationWithCorrectSettings()
    {
        UserAiSettings? capturedSettings = null;
        conversationFactory.CreateConversation(
                Arg.Do<UserAiSettings>(s => capturedSettings = s),
                Arg.Any<IReadOnlyCollection<Tool>>(),
                Arg.Any<double>())
            .Returns(Result.Success(conversation));

        await sut.ProcessMessageAsync("hello", attachmentIds: null, settings: settings, operationId: operationId);

        capturedSettings.Should().BeSameAs(settings);
    }

    [Test]
    public async Task ProcessMessageAsync_ShouldCreateConversationWithTools()
    {
        IReadOnlyCollection<Tool>? capturedTools = null;
        conversationFactory.CreateConversation(
                Arg.Any<UserAiSettings>(),
                Arg.Do<IReadOnlyCollection<Tool>>(t => capturedTools = t),
                Arg.Any<double>())
            .Returns(Result.Success(conversation));

        await sut.ProcessMessageAsync("hello", attachmentIds: null, settings: settings, operationId: operationId);

        capturedTools.Should().NotBeNull();
        capturedTools!.Should().NotBeEmpty();
    }

    #endregion

    #region ProcessMessageAsync - Prompt Building

    [Test]
    public async Task ProcessMessageAsync_ShouldPrependSystemInstructions()
    {
        await sut.ProcessMessageAsync("hello", attachmentIds: null, settings: settings, operationId: operationId);

        conversation.Received(1).PrependSystemMessage(Arg.Is<string>(text => text.Contains("Ты - помощник")));
    }

    [Test]
    public async Task ProcessMessageAsync_ShouldAddPreviousMessages()
    {
        var previousMessage = ChatMessage.CreateSystemMessage(session.Id, "existing instruction");
        chatService.GetMessagesAsync(Arg.Any<CancellationToken>())
            .Returns(Success<IReadOnlyCollection<ChatMessage>>([previousMessage]));

        await sut.ProcessMessageAsync("hello", attachmentIds: null, settings: settings, operationId: operationId);

        conversation.Received(1).AddMessages(Arg.Is<IEnumerable<TornadoChatMessage>>(messages =>
            messages.Count() == 1 &&
            messages.Single().Content == previousMessage.Content &&
            messages.Single().Role == ChatMessageRoles.System));
    }

    [Test]
    public async Task ProcessMessageAsync_WhenNoPreviousMessages_ShouldAddEmptyList()
    {
        chatService.GetMessagesAsync(Arg.Any<CancellationToken>())
            .Returns(Success<IReadOnlyCollection<ChatMessage>>([]));

        await sut.ProcessMessageAsync("hello", attachmentIds: null, settings: settings, operationId: operationId);

        conversation.Received(1).AddMessages(Arg.Is<IEnumerable<TornadoChatMessage>>(messages =>
            !messages.Any()));
    }

    [Test]
    public async Task ProcessMessageAsync_ShouldAddUserMessageWithPrompt()
    {
        const string prompt = "Explain the latest note.";

        await sut.ProcessMessageAsync(prompt, attachmentIds: null, settings: settings, operationId: operationId);

        conversation.Received(1).AddUserMessage(Arg.Is<IEnumerable<ChatMessagePart>>(parts =>
            parts.Count() == 1 &&
            parts.Single().Text == prompt));
    }

    #endregion

    #region ProcessMessageAsync - Message Persistence

    [Test]
    public async Task ProcessMessageAsync_WhenSuccessful_ShouldPersistUserMessage()
    {
        const string prompt = "Explain the latest note.";

        await sut.ProcessMessageAsync(prompt, attachmentIds: null, settings: settings, operationId: operationId);

        await chatService.Received(1).PersistMessageAsync(
            Arg.Is<ChatMessage>(m =>
                m.SessionId == session.Id &&
                m.Role == ChatMessageRole.User &&
                m.Content == prompt),
            Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenSuccessful_ShouldPersistAiResponse()
    {
        conversation.StreamResponseWithToolsAsync(
                Arg.Any<Func<List<FunctionCall>, CancellationToken, ValueTask>>(),
                Arg.Any<Func<string, ValueTask>>(),
                Arg.Any<CancellationToken>())
            .Returns(("AI response text", 0));

        await sut.ProcessMessageAsync("hello", attachmentIds: null, settings: settings, operationId: operationId);

        await chatService.Received(1).PersistMessagesAsync(
            Arg.Is<IReadOnlyCollection<ChatMessage>>(messages =>
                messages.Count == 1 &&
                messages.Single().SessionId == session.Id &&
                messages.Single().Role == ChatMessageRole.Ai &&
                messages.Single().Content == "AI response text"),
            Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenSuccessful_ShouldSendMessageChunkAndCompletion()
    {
        await sut.ProcessMessageAsync("hello", attachmentIds: null, settings: settings, operationId: operationId);

        await notificationService.Received(1).SendMessageChunkAsync(
            operationId,
            Arg.Any<Guid>(),
            "assistant response",
            Arg.Any<CancellationToken>());
        await notificationService.Received(1).SendMessageCompletedAsync(
            operationId,
            Arg.Any<Guid>(),
            Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenSuccessful_ShouldReturnOkStatus()
    {
        var result = await sut.ProcessMessageAsync("hello", attachmentIds: null, settings: settings, operationId: operationId);

        result.Status.Should().Be(ResultStatus.Ok);
    }

    #endregion

    #region ProcessMessageAsync - Attachments

    [Test]
    public async Task ProcessMessageAsync_WhenAttachmentsProvided_ShouldLoadAttachments()
    {
        var attachmentId = Guid.NewGuid();
        var attachment = CreateImageAttachment(attachmentId);
        ConfigureAttachment(attachmentId, attachment);

        await sut.ProcessMessageAsync("hello", [attachmentId], settings, operationId);

        await attachmentService.Received(1).GetByIdsAsync(
            Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.SequenceEqual(new[] { attachmentId })),
            Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenAttachmentsProvided_ShouldLoadBlobData()
    {
        var attachmentId = Guid.NewGuid();
        var attachment = CreateImageAttachment(attachmentId);
        ConfigureAttachment(attachmentId, attachment);

        await sut.ProcessMessageAsync("hello", [attachmentId], settings, operationId);

        await blobStorageService.Received(1).GetAsync(attachment.BlobId, Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenImageAttachmentProvided_ShouldBuildMessageWithImageParts()
    {
        const string prompt = "Summarize the attachment.";
        var attachmentId = Guid.NewGuid();
        var attachment = CreateImageAttachment(attachmentId, "notes.png", "image/png");
        ConfigureAttachment(attachmentId, attachment);

        IReadOnlyList<ChatMessagePart>? capturedParts = null;
        conversation.When(c => c.AddUserMessage(Arg.Any<IEnumerable<ChatMessagePart>>()))
            .Do(callInfo => capturedParts = callInfo.Arg<IEnumerable<ChatMessagePart>>().ToList());

        await sut.ProcessMessageAsync(prompt, [attachmentId], settings, operationId);

        capturedParts.Should().NotBeNull();
        capturedParts!.Should().HaveCount(3);
        capturedParts[0].Text.Should().Be(prompt);
        capturedParts[1].Text.Should().Be("Attachment: `notes.png` (image/png)");
        capturedParts[2].Image.Should().NotBeNull();
        capturedParts[2].Image!.MimeType.Should().Be("image/png");
    }

    [Test]
    public async Task ProcessMessageAsync_WhenAttachmentsNull_ShouldNotLoadAttachments()
    {
        await sut.ProcessMessageAsync("hello", attachmentIds: null, settings: settings, operationId: operationId);

        await attachmentService.DidNotReceive()
            .GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenAttachmentsEmpty_ShouldNotLoadAttachments()
    {
        await sut.ProcessMessageAsync("hello", [], settings, operationId);

        await attachmentService.DidNotReceive()
            .GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenMultipleAttachmentsProvided_ShouldLoadAllBlobs()
    {
        var attachmentId1 = Guid.NewGuid();
        var attachmentId2 = Guid.NewGuid();
        var attachment1 = CreateImageAttachment(attachmentId1, "file1.png", "image/png");
        var attachment2 = CreateImageAttachment(attachmentId2, "file2.png", "image/png");

        attachmentService.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(Success<IReadOnlyList<ChatAttachment>>([attachment1, attachment2]));
        blobStorageService.GetAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => Success<Stream>(new MemoryStream([1, 2, 3])));

        await sut.ProcessMessageAsync("hello", [attachmentId1, attachmentId2], settings, operationId);

        await blobStorageService.Received(1).GetAsync(attachment1.BlobId, Arg.Any<CancellationToken>());
        await blobStorageService.Received(1).GetAsync(attachment2.BlobId, Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenAttachmentLoadFails_ShouldReturnError()
    {
        var attachmentId = Guid.NewGuid();
        
        attachmentService.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<IReadOnlyList<ChatAttachment>>.Error("attachment not found")));

        var result = await sut.ProcessMessageAsync("hello", [attachmentId], settings, operationId);

        result.Status.Should().Be(ResultStatus.Error);
        result.Errors.Should().ContainSingle().Which.Should().Be("attachment not found");
    }

    [Test]
    public async Task ProcessMessageAsync_WhenBlobLoadFails_ShouldReturnError()
    {
        var attachmentId = Guid.NewGuid();
        var attachment = CreateImageAttachment(attachmentId);
        
        attachmentService.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<IReadOnlyList<ChatAttachment>>([attachment])));
        blobStorageService.GetAsync(attachment.BlobId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<Stream>.Error("blob not found")));

        var result = await sut.ProcessMessageAsync("hello", [attachmentId], settings, operationId);

        result.Status.Should().Be(ResultStatus.Error);
        result.Errors.Should().ContainSingle().Which.Should().Be("blob not found");
    }

    [Test]
    public async Task ProcessMessageAsync_WhenAttachmentsProvided_ShouldMarkAttachmentsAsConsumed()
    {
        var attachmentId = Guid.NewGuid();
        var attachment = CreateImageAttachment(attachmentId);
        ConfigureAttachment(attachmentId, attachment);

        await sut.ProcessMessageAsync("hello", [attachmentId], settings, operationId);

        await attachmentService.Received(1).MarkConsumedAsync(
            Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.SequenceEqual(new[] { attachmentId })),
            Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenMultipleAttachmentsProvided_ShouldMarkAllAsConsumed()
    {
        var attachmentId1 = Guid.NewGuid();
        var attachmentId2 = Guid.NewGuid();
        var attachment1 = CreateImageAttachment(attachmentId1, "file1.png", "image/png");
        var attachment2 = CreateImageAttachment(attachmentId2, "file2.png", "image/png");

        attachmentService.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(Success<IReadOnlyList<ChatAttachment>>([attachment1, attachment2]));
        blobStorageService.GetAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => Success<Stream>(new MemoryStream([1, 2, 3])));

        await sut.ProcessMessageAsync("hello", [attachmentId1, attachmentId2], settings, operationId);

        await attachmentService.Received(1).MarkConsumedAsync(
            Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Count == 2 && ids.Contains(attachmentId1) && ids.Contains(attachmentId2)),
            Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenAttachmentsNull_ShouldNotMarkConsumed()
    {
        await sut.ProcessMessageAsync("hello", attachmentIds: null, settings: settings, operationId: operationId);

        await attachmentService.DidNotReceive()
            .MarkConsumedAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenAttachmentsEmpty_ShouldNotMarkConsumed()
    {
        await sut.ProcessMessageAsync("hello", [], settings, operationId);

        await attachmentService.DidNotReceive()
            .MarkConsumedAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
    }

    #endregion

    #region ProcessMessageAsync - Tool Calls

    [Test]
    public async Task ProcessMessageAsync_WhenToolCallsReturned_ShouldDispatchTools()
    {
        aiToolsService.MoveFileAsync("from.txt", "to.txt", Arg.Any<CancellationToken>())
            .Returns(Success("moved"));
        ConfigureToolLoop(
            invocation => invocation == 1
                ? ToolCallResponse("move_file", """{"sourcePath":"from.txt","destinationPath":"to.txt"}""")
                : FinalResponse("done"));

        await sut.ProcessMessageAsync("Move the file.", attachmentIds: null, settings: settings, operationId: operationId);

        await aiToolsService.Received(1).MoveFileAsync("from.txt", "to.txt", Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenToolCallsReturned_ShouldContinueUntilConvergence()
    {
        aiToolsService.MoveFileAsync("from.txt", "to.txt", Arg.Any<CancellationToken>())
            .Returns(Success("moved"));
        var invocationCount = 0;
        ConfigureToolLoop(
            _ =>
            {
                invocationCount++;
                return invocationCount == 1
                    ? ToolCallResponse("move_file", """{"sourcePath":"from.txt","destinationPath":"to.txt"}""")
                    : FinalResponse("done");
            });

        await sut.ProcessMessageAsync("Move the file.", attachmentIds: null, settings: settings, operationId: operationId);

        invocationCount.Should().Be(2);
    }

    [Test]
    public async Task ProcessMessageAsync_WhenToolCallsConverge_ShouldPersistFinalResponse()
    {
        aiToolsService.MoveFileAsync("from.txt", "to.txt", Arg.Any<CancellationToken>())
            .Returns(Success("moved"));
        ConfigureToolLoop(
            invocation => invocation == 1
                ? ToolCallResponse("move_file", """{"sourcePath":"from.txt","destinationPath":"to.txt"}""")
                : FinalResponse("done"));

        await sut.ProcessMessageAsync("Move the file.", attachmentIds: null, settings: settings, operationId: operationId);

        await chatService.Received(1).PersistMessagesAsync(
            Arg.Is<IReadOnlyCollection<ChatMessage>>(messages =>
                messages.Count == 2 &&
                messages.All(message => message.Role == ChatMessageRole.Ai) &&
                messages.Last().Content == "done"),
            Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenConversationDoesNotConverge_ShouldReturnErrorAfterMaxTurns()
    {
        var invocationCount = 0;
        conversation.StreamResponseWithToolsAsync(
                Arg.Any<Func<List<FunctionCall>, CancellationToken, ValueTask>>(),
                Arg.Any<Func<string, ValueTask>>(),
                Arg.Any<CancellationToken>())
            .Returns(_ =>
            {
                invocationCount++;
                return ("tool call", 1);
            });

        var result = await sut.ProcessMessageAsync("hello", attachmentIds: null, settings: settings, operationId: operationId);

        result.Status.Should().Be(ResultStatus.Invalid);
        result.ValidationErrors.Should().ContainSingle(error =>
            error.ErrorMessage == "Agent did not converge after 10 iterations" &&
            error.ErrorCode == ChatProcessingErrorCode.LlmInvalidResponse.ToString());
        invocationCount.Should().Be(10);
    }

    [Test]
    public async Task ProcessMessageAsync_WhenConversationDoesNotConverge_ShouldNotPersistMessages()
    {
        conversation.StreamResponseWithToolsAsync(
                Arg.Any<Func<List<FunctionCall>, CancellationToken, ValueTask>>(),
                Arg.Any<Func<string, ValueTask>>(),
                Arg.Any<CancellationToken>())
            .Returns(("tool call", 1));

        await sut.ProcessMessageAsync("hello", attachmentIds: null, settings: settings, operationId: operationId);

        await chatService.DidNotReceive()
            .PersistMessageAsync(Arg.Any<ChatMessage>(), Arg.Any<CancellationToken>());
        await chatService.DidNotReceive()
            .PersistMessagesAsync(Arg.Any<IReadOnlyCollection<ChatMessage>>(), Arg.Any<CancellationToken>());
    }

    #endregion

    #region ProcessMessageAsync - Error Handling

    [Test]
    public async Task ProcessMessageAsync_WhenStreamReturnsEmptyResponse_ShouldNotPersistAiMessages()
    {
        conversation.StreamResponseWithToolsAsync(
                Arg.Any<Func<List<FunctionCall>, CancellationToken, ValueTask>>(),
                Arg.Any<Func<string, ValueTask>>(),
                Arg.Any<CancellationToken>())
            .Returns((string.Empty, 0));

        await sut.ProcessMessageAsync("hello", attachmentIds: null, settings: settings, operationId: operationId);

        await chatService.Received(1)
            .PersistMessagesAsync(Arg.Any<IReadOnlyCollection<ChatMessage>>(), Arg.Any<CancellationToken>());
        await chatService.DidNotReceive()
            .PersistMessagesAsync(
                Arg.Is<IReadOnlyCollection<ChatMessage>>(messages => messages.Any()),
                Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenStreamThrows_ShouldPropagateException()
    {
        conversation.StreamResponseWithToolsAsync(
                Arg.Any<Func<List<FunctionCall>, CancellationToken, ValueTask>>(),
                Arg.Any<Func<string, ValueTask>>(),
                Arg.Any<CancellationToken>())
            .ThrowsAsync(new InvalidOperationException("boom"));

        var act = () => sut.ProcessMessageAsync("hello", attachmentIds: null, settings: settings, operationId: operationId);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("boom");
    }

    #endregion

    #region TestConnectionAsync

    [Test]
    public async Task TestConnectionAsync_ShouldCreateSimpleConversation()
    {
        await sut.TestConnectionAsync(settings);

        conversationFactory.Received(1).CreateSimpleConversation(settings);
    }

    [Test]
    public async Task TestConnectionAsync_WhenConversationCreationFails_ShouldReturnSettingsWithError()
    {
        conversationFactory.CreateSimpleConversation(Arg.Any<UserAiSettings>())
            .Returns(Result<ITornadoConversation>.Error("Invalid API key"));

        var result = await sut.TestConnectionAsync(settings);

        result.Should().BeSameAs(settings);
        result.LastTestSuccess.Should().BeFalse();
        result.LastTestError.Should().Be("Invalid API key");
    }

    [Test]
    public async Task TestConnectionAsync_WhenSuccessful_ShouldUpdateSettingsWithSuccess()
    {
        var result = await sut.TestConnectionAsync(settings);

        result.Should().BeSameAs(settings);
        result.LastTestSuccess.Should().BeTrue();
        result.LastTestError.Should().BeNull();
    }

    [Test]
    public async Task TestConnectionAsync_WhenSuccessful_ShouldMeasureLatency()
    {
        var result = await sut.TestConnectionAsync(settings);

        result.LastTestLatencyMs.Should().NotBeNull();
        result.LastTestLatencyMs!.Value.Should().BeGreaterThanOrEqualTo(0);
    }

    [Test]
    public async Task TestConnectionAsync_WhenConversationFails_ShouldUpdateSettingsWithError()
    {
        conversation.GetResponseAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(TornadoConversationResponse.Failure(new InvalidOperationException("boom"))));

        var result = await sut.TestConnectionAsync(settings);

        result.Should().BeSameAs(settings);
        result.LastTestSuccess.Should().BeFalse();
        result.LastTestError.Should().Be("Error while processing message");
    }

    [Test]
    public async Task TestConnectionAsync_WhenConversationFails_ShouldNotSetLatency()
    {
        conversation.GetResponseAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(TornadoConversationResponse.Failure(new InvalidOperationException("boom"))));

        var result = await sut.TestConnectionAsync(settings);

        result.LastTestLatencyMs.Should().BeNull();
    }

    [Test]
    public async Task TestConnectionAsync_WhenResponseHasNoData_ShouldUpdateSettingsWithError()
    {
        conversation.GetResponseAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(new TornadoConversationResponse(null, false, false)));

        var result = await sut.TestConnectionAsync(settings);

        result.LastTestSuccess.Should().BeFalse();
        result.LastTestError.Should().Be("Error while processing message");
    }

    #endregion

    #region Helpers

    private void ConfigureDefaults()
    {
        chatService.GetOrCreateActiveSessionAsync(Arg.Any<CancellationToken>())
            .Returns(Success(session));
        chatService.GetMessagesAsync(Arg.Any<CancellationToken>())
            .Returns(Success<IReadOnlyCollection<ChatMessage>>([]));
        chatService.PersistMessageAsync(Arg.Any<ChatMessage>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => Success(callInfo.Arg<ChatMessage>()));
        chatService.PersistMessagesAsync(Arg.Any<IReadOnlyCollection<ChatMessage>>(), Arg.Any<CancellationToken>())
            .Returns(Success());

        conversationFactory.CreateConversation(
                Arg.Any<UserAiSettings>(),
                Arg.Any<IReadOnlyCollection<Tool>>(),
                Arg.Any<double>())
            .Returns(Result.Success(conversation));
        conversationFactory.CreateSimpleConversation(Arg.Any<UserAiSettings>())
            .Returns(Result.Success(conversation));

        notificationService.SendMessageChunkAsync(Arg.Any<Guid>(), Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);
        notificationService.SendMessageCompletedAsync(Arg.Any<Guid>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);

        conversation.StreamResponseWithToolsAsync(
                Arg.Any<Func<List<FunctionCall>, CancellationToken, ValueTask>>(),
                Arg.Any<Func<string, ValueTask>>(),
                Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                var tokensHandler = callInfo.Arg<Func<string, ValueTask>>();
                return EmitTokensAsync(tokensHandler, "assistant response");
            });
        conversation.GetResponseAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(TornadoConversationResponse.Success("connection ok", false)));

        attachmentService.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(Success<IReadOnlyList<ChatAttachment>>([]));
        attachmentService.MarkConsumedAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(Success());
    }

    private void ConfigureAttachment(Guid attachmentId, ChatAttachment attachment)
    {
        attachmentService.GetByIdsAsync(
                Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Contains(attachmentId)),
                Arg.Any<CancellationToken>())
            .Returns(Success<IReadOnlyList<ChatAttachment>>([attachment]));
        blobStorageService.GetAsync(attachment.BlobId, Arg.Any<CancellationToken>())
            .Returns(Success<Stream>(new MemoryStream([1, 2, 3])));
    }

    private void ConfigureToolLoop(Func<int, (string Response, FunctionCall? Call)> responseFactory)
    {
        var invocationCount = 0;
        conversation.StreamResponseWithToolsAsync(
                Arg.Any<Func<List<FunctionCall>, CancellationToken, ValueTask>>(),
                Arg.Any<Func<string, ValueTask>>(),
                Arg.Any<CancellationToken>())
            .Returns(async callInfo =>
            {
                invocationCount++;
                var (response, call) = responseFactory(invocationCount);
                if (call is not null)
                {
                    var handleToolCalls = callInfo.Arg<Func<List<FunctionCall>, CancellationToken, ValueTask>>();
                    var ct = callInfo.Arg<CancellationToken>();
                    await handleToolCalls([call], ct);
                }

                var tokensHandler = callInfo.Arg<Func<string, ValueTask>>();
                await tokensHandler(response);
                return (response, call is null ? 0 : 1);
            });
    }

    private static UserAiSettings CreateSettings()
    {
        return new UserAiSettings(
            Guid.NewGuid(),
            apiKeyEncrypted: "encrypted-key",
            provider: AiProvider.OpenAI,
            modelId: "gpt-test");
    }

    private static ChatAttachment CreateImageAttachment(
        Guid attachmentId,
        string fileName = "image.png",
        string contentType = "image/png")
    {
        return new ChatAttachment(attachmentId, Guid.NewGuid(), Guid.NewGuid(), fileName, contentType, 128);
    }

    private static (string Response, FunctionCall? Call) ToolCallResponse(
        string toolName, string arguments)
    {
        var call = new FunctionCall { Name = toolName, Arguments = arguments };
        return ("tool requested", call);
    }

    private static (string Response, FunctionCall? Call) FinalResponse(string text)
    {
        return (text, null);
    }

    private static async Task<(string response, int toolCalls)> EmitTokensAsync(
        Func<string, ValueTask> tokensHandler,
        string response,
        int toolCalls = 0)
    {
        await tokensHandler(response);
        return (response, toolCalls);
    }

    private static Task<Result> Success()
    {
        return Task.FromResult(Result.Success());
    }

    private static Task<Result<T>> Success<T>(T value)
    {
        return Task.FromResult(Result.Success(value));
    }

    private static Task<Result<T>> Error<T>(string message)
    {
        return Task.FromResult(Result<T>.Error(message));
    }

    #endregion
}
