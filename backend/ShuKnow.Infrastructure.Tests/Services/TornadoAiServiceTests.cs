using Ardalis.Result;
using AwesomeAssertions;
using LlmTornado.Chat;
using LlmTornado.ChatFunctions;
using LlmTornado.Code;
using LlmTornado.Common;
using Microsoft.Extensions.Logging;
using NSubstitute;
using ShuKnow.Application.Interfaces;
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
    private ITornadoConversationFactory conversationFactory = null!;
    private ITornadoConversation conversation = null!;
    private ILogger<TornadoAiService> logger = null!;
    private TornadoAiService sut = null!;
    private ChatSession session = null!;
    private UserAiSettings settings = null!;

    [SetUp]
    public void SetUp()
    {
        attachmentService = Substitute.For<IAttachmentService>();
        blobStorageService = Substitute.For<IBlobStorageService>();
        chatService = Substitute.For<IChatService>();
        aiToolsService = Substitute.For<IAiToolsService>();
        conversationFactory = Substitute.For<ITornadoConversationFactory>();
        conversation = Substitute.For<ITornadoConversation>();
        logger = Substitute.For<ILogger<TornadoAiService>>();

        session = new ChatSession(Guid.NewGuid(), Guid.NewGuid());
        settings = new UserAiSettings(
            Guid.NewGuid(),
            apiKeyEncrypted: "encrypted-key",
            provider: AiProvider.OpenAI,
            modelId: "gpt-test");

        chatService.GetOrCreateActiveSessionAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success(session)));
        chatService.GetMessagesAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<IReadOnlyList<ChatMessage>>([])));
        chatService.PersistMessageAsync(Arg.Any<ChatMessage>(), Arg.Any<CancellationToken>())
            .Returns(callInfo => Task.FromResult(Result.Success(callInfo.Arg<ChatMessage>())));

        conversationFactory.CreateConversation(
                Arg.Any<UserAiSettings>(),
                Arg.Any<IReadOnlyCollection<Tool>>(),
                Arg.Any<double>())
            .Returns(Result.Success(conversation));
        conversationFactory.CreateSimpleConversation(Arg.Any<UserAiSettings>())
            .Returns(Result.Success(conversation));

        conversation.GetResponseWithToolsAsync(
                Arg.Any<Func<List<FunctionCall>, CancellationToken, ValueTask>>(),
                Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(TornadoConversationResponse.Success("assistant response", false)));
        conversation.GetResponseAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(TornadoConversationResponse.Success("connection ok", false)));

        var promptBuilder = new TornadoPromptBuilder(attachmentService, blobStorageService, chatService);
        var toolsService = new TornadoToolsService(aiToolsService);
        sut = new TornadoAiService(promptBuilder, chatService, toolsService, conversationFactory, logger);
    }

    [Test]
    public async Task ProcessMessageAsync_WhenActiveSessionLookupFails_ShouldReturnFailureWithoutCreatingConversation()
    {
        chatService.GetOrCreateActiveSessionAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<ChatSession>.Error("session failed")));

        var result = await sut.ProcessMessageAsync("hello", attachmentIds: null, settings);

        result.Status.Should().Be(ResultStatus.Error);
        result.Errors.Should().ContainSingle().Which.Should().Be("session failed");
        conversationFactory.DidNotReceiveWithAnyArgs().CreateConversation(default!, default!, default);
        await chatService.DidNotReceive()
            .PersistMessageAsync(Arg.Any<ChatMessage>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenConversationCreationFails_ShouldReturnFailureWithoutPersistingMessages()
    {
        conversationFactory.CreateConversation(
                Arg.Any<UserAiSettings>(),
                Arg.Any<IReadOnlyCollection<Tool>>(),
                Arg.Any<double>())
            .Returns(Result<ITornadoConversation>.Error("API key is not configured"));

        var result = await sut.ProcessMessageAsync("hello", attachmentIds: null, settings);

        result.Status.Should().Be(ResultStatus.Error);
        result.Errors.Should().ContainSingle().Which.Should().Be("API key is not configured");
        await chatService.DidNotReceive()
            .PersistMessageAsync(Arg.Any<ChatMessage>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenConversationSucceeds_ShouldBuildPromptAndPersistMessages()
    {
        const string prompt = "Explain the latest note.";
        var previousMessage = ChatMessage.CreateSystemMessage(session.Id, "existing instruction");
        chatService.GetMessagesAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<IReadOnlyList<ChatMessage>>([previousMessage])));

        var result = await sut.ProcessMessageAsync(prompt, attachmentIds: null, settings);

        result.Status.Should().Be(ResultStatus.Ok);
        conversation.Received(1).PrependSystemMessage(Arg.Is<string>(text => text.Contains("Ты - помощник")));
        conversation.Received(1).AddMessages(Arg.Is<IEnumerable<TornadoChatMessage>>(messages =>
            messages.Count() == 1 &&
            messages.Single().Content == previousMessage.Content &&
            messages.Single().Role == ChatMessageRoles.System));
        conversation.Received(1).AddUserMessage(Arg.Is<IEnumerable<ChatMessagePart>>(parts =>
            parts.Count() == 1 &&
            parts.Single().Text == prompt));
        await chatService.Received(1).PersistMessageAsync(
            Arg.Is<ChatMessage>(message =>
                message.SessionId == session.Id &&
                message.Role == ChatMessageRole.User &&
                message.Content == prompt),
            Arg.Any<CancellationToken>());
        await chatService.Received(1).PersistMessageAsync(
            Arg.Is<ChatMessage>(message =>
                message.SessionId == session.Id &&
                message.Role == ChatMessageRole.Ai &&
                message.Content == "assistant response"),
            Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenAttachmentsProvided_ShouldLoadAttachmentsAndAppendAttachmentParts()
    {
        const string prompt = "Summarize the attachment.";
        var attachmentId = Guid.NewGuid();
        var attachment = new ChatAttachment(
            attachmentId,
            Guid.NewGuid(),
            "notes.png",
            "image/png",
            128)
        {
            BlobId = Guid.NewGuid()
        };

        attachmentService.GetByIdsAsync(
                Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.SequenceEqual(new[] { attachmentId })),
                Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<IReadOnlyList<ChatAttachment>>([attachment])));
        blobStorageService.GetAsync(attachment.BlobId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<Stream>(new MemoryStream([1, 2, 3]))));

        IReadOnlyList<ChatMessagePart>? capturedParts = null;
        conversation.When(c => c.AddUserMessage(Arg.Any<IEnumerable<ChatMessagePart>>()))
            .Do(callInfo => capturedParts = callInfo.Arg<IEnumerable<ChatMessagePart>>().ToList());

        var result = await sut.ProcessMessageAsync(prompt, [attachmentId], settings);

        result.Status.Should().Be(ResultStatus.Ok);
        await attachmentService.Received(1).GetByIdsAsync(
            Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.SequenceEqual(new[] { attachmentId })),
            Arg.Any<CancellationToken>());
        await blobStorageService.Received(1).GetAsync(attachment.BlobId, Arg.Any<CancellationToken>());
        capturedParts.Should().NotBeNull();
        capturedParts!.Should().HaveCount(3);
        capturedParts[0].Text.Should().Be(prompt);
        capturedParts[1].Text.Should().Be("Attachement: `notes.png` (image/png)");
        capturedParts[2].Image.Should().NotBeNull();
        capturedParts[2].Image!.Url.Should().Be("AQID");
        capturedParts[2].Image!.MimeType.Should().Be("image/png");
    }

    [Test]
    public async Task ProcessMessageAsync_WhenToolCallsAreReturned_ShouldDispatchToolsUntilConversationConverges()
    {
        aiToolsService.MoveFileAsync("from.txt", "to.txt", Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success("moved")));

        var invocationCount = 0;
        conversation.GetResponseWithToolsAsync(
                Arg.Any<Func<List<FunctionCall>, CancellationToken, ValueTask>>(),
                Arg.Any<CancellationToken>())
            .Returns(callInfo => HandleToolLoopAsync(
                callInfo.Arg<Func<List<FunctionCall>, CancellationToken, ValueTask>>(),
                callInfo.Arg<CancellationToken>(),
                ++invocationCount));

        var result = await sut.ProcessMessageAsync("Move the file.", attachmentIds: null, settings);

        result.Status.Should().Be(ResultStatus.Ok);
        invocationCount.Should().Be(2);
        await aiToolsService.Received(1).MoveFileAsync("from.txt", "to.txt", Arg.Any<CancellationToken>());
        await chatService.Received(1).PersistMessageAsync(
            Arg.Is<ChatMessage>(message => message.Role == ChatMessageRole.Ai && message.Content == "done"),
            Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenConversationResponseFails_ShouldReturnErrorWithoutPersistingMessages()
    {
        conversation.GetResponseWithToolsAsync(
                Arg.Any<Func<List<FunctionCall>, CancellationToken, ValueTask>>(),
                Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(TornadoConversationResponse.Failure(new InvalidOperationException("boom"))));

        var result = await sut.ProcessMessageAsync("hello", attachmentIds: null, settings);

        result.Status.Should().Be(ResultStatus.Error);
        result.Errors.Should().ContainSingle().Which.Should().Be("Error while processing message");
        await chatService.DidNotReceive()
            .PersistMessageAsync(Arg.Any<ChatMessage>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ProcessMessageAsync_WhenConversationDoesNotConverge_ShouldReturnErrorAfterMaxTurns()
    {
        var invocationCount = 0;
        conversation.GetResponseWithToolsAsync(
                Arg.Any<Func<List<FunctionCall>, CancellationToken, ValueTask>>(),
                Arg.Any<CancellationToken>())
            .Returns(_ =>
            {
                invocationCount++;
                return Task.FromResult(TornadoConversationResponse.Success("tool call", true));
            });

        var result = await sut.ProcessMessageAsync("hello", attachmentIds: null, settings);

        result.Status.Should().Be(ResultStatus.Error);
        result.Errors.Should().ContainSingle().Which.Should().Be("Agent did not converge after 10 iterations");
        invocationCount.Should().Be(10);
        await chatService.DidNotReceive()
            .PersistMessageAsync(Arg.Any<ChatMessage>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task TestConnectionAsync_WhenConversationSucceeds_ShouldUpdateSettingsWithLatency()
    {
        var result = await sut.TestConnectionAsync(settings);

        result.Should().BeSameAs(settings);
        result.LastTestSuccess.Should().BeTrue();
        result.LastTestLatencyMs.Should().NotBeNull();
        result.LastTestError.Should().BeNull();
    }

    [Test]
    public async Task TestConnectionAsync_WhenConversationFails_ShouldUpdateSettingsWithError()
    {
        conversation.GetResponseAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(TornadoConversationResponse.Failure(new InvalidOperationException("boom"))));

        var result = await sut.TestConnectionAsync(settings);

        result.Should().BeSameAs(settings);
        result.LastTestSuccess.Should().BeFalse();
        result.LastTestLatencyMs.Should().BeNull();
        result.LastTestError.Should().Be("Error while processing message");
    }

    private static async Task<TornadoConversationResponse> HandleToolLoopAsync(
        Func<List<FunctionCall>, CancellationToken, ValueTask> handleToolCalls,
        CancellationToken ct,
        int invocationCount)
    {
        if (invocationCount == 1)
        {
            await handleToolCalls(
                [new FunctionCall
                {
                    Name = "move_file",
                    Arguments = """{"sourcePath":"from.txt","destinationPath":"to.txt"}"""
                }],
                ct);

            return TornadoConversationResponse.Success("tool requested", true);
        }

        return TornadoConversationResponse.Success("done", false);
    }
}
