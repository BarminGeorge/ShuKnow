using AwesomeAssertions;
using Microsoft.AspNetCore.SignalR;
using NSubstitute;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.WebAPI.Events;
using ShuKnow.WebAPI.Hubs;
using ShuKnow.WebAPI.Services;
using FileEntity = ShuKnow.Domain.Entities.File;

namespace ShuKnow.WebAPI.Tests.Services;

public class ChatNotificationServiceTests
{
    private const string ConnectionId = "connection-42";

    private ICurrentConnectionService currentConnection = null!;
    private IHubContext<ChatHub> hubContext = null!;
    private IHubClients hubClients = null!;
    private ISingleClientProxy clientProxy = null!;
    private ChatNotificationService sut = null!;

    [SetUp]
    public void SetUp()
    {
        currentConnection = Substitute.For<ICurrentConnectionService>();
        hubContext = Substitute.For<IHubContext<ChatHub>>();
        hubClients = Substitute.For<IHubClients>();
        clientProxy = Substitute.For<ISingleClientProxy>();

        currentConnection.connectionId.Returns(ConnectionId);
        hubContext.Clients.Returns(hubClients);
        hubClients.Client(ConnectionId).Returns(clientProxy);
        clientProxy.SendCoreAsync(Arg.Any<string>(), Arg.Any<object?[]>(), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);

        sut = new ChatNotificationService(currentConnection, hubContext);
    }

    [Test]
    public async Task SendProcessingStartedAsync_WhenCalled_ShouldSendProcessingStartedEventToCurrentClient()
    {
        var operationId = Guid.NewGuid();
        var ct = new CancellationTokenSource().Token;

        await sut.SendProcessingStartedAsync(operationId, ct);

        hubClients.Received(1).Client(ConnectionId);
        AssertSentEvent<ProcessingStartedEvent>(
            nameof(ChatHub.OnProcessingStarted),
            @event => @event.OperationId.Should().Be(operationId),
            ct);
    }

    [Test]
    public async Task SendMessageChunkAsync_WhenCalled_ShouldSendMessageChunkEvent()
    {
        var operationId = Guid.NewGuid();
        var messageId = Guid.NewGuid();
        const string chunk = "hello";

        await sut.SendMessageChunkAsync(operationId, messageId, chunk);

        AssertSentEvent<MessageChunkEvent>(
            nameof(ChatHub.OnMessageChunk),
            @event =>
            {
                @event.OperationId.Should().Be(operationId);
                @event.MessageId.Should().Be(messageId);
                @event.Chunk.Should().Be(chunk);
            });
    }

    [Test]
    public async Task SendFileCreatedAsync_WhenCalled_ShouldSendMappedFileCreatedEvent()
    {
        var createdAt = new DateTimeOffset(2026, 4, 10, 12, 30, 0, TimeSpan.Zero);
        var file = CreateFile(
            folderId: Guid.NewGuid(),
            name: "report.pdf",
            description: "Quarterly report",
            contentType: "application/pdf",
            sizeBytes: 2048,
            version: 3,
            checksumSha256: "abc123",
            sortOrder: 7,
            createdAt: createdAt);

        await sut.SendFileCreatedAsync(file);

        AssertSentEvent<FileCreatedEvent>(
            nameof(ChatHub.OnFileCreated),
            @event =>
            {
                @event.FolderId.Should().Be(file.FolderId);
                @event.Name.Should().Be(file.Name);
                @event.Description.Should().Be(file.Description);
                @event.ContentType.Should().Be(file.ContentType);
                @event.SizeBytes.Should().Be(file.SizeBytes);
                @event.Version.Should().Be(file.Version);
                @event.ChecksumSha256.Should().Be(file.ChecksumSha256);
                @event.SortOrder.Should().Be(file.SortOrder);
                @event.CreatedAt.Should().Be(createdAt);
                @event.FileId.Should().Be(file.Id);
            });
    }

    [Test]
    public async Task SendFileMovedAsync_WhenCalled_ShouldSendMappedFileMovedEvent()
    {
        var fromFolderId = Guid.NewGuid();
        var toFolderId = Guid.NewGuid();
        var file = CreateFile(folderId: toFolderId, name: "report.pdf", version: 5);

        await sut.SendFileMovedAsync(file, fromFolderId);

        AssertSentEvent<FileMovedEvent>(
            nameof(ChatHub.OnFileMoved),
            @event =>
            {
                @event.FileId.Should().Be(file.Id);
                @event.FileName.Should().Be(file.Name);
                @event.FromFolderId.Should().Be(fromFolderId);
                @event.ToFolderId.Should().Be(toFolderId);
                @event.Version.Should().Be(file.Version);
            });
    }

    [Test]
    public async Task SendFolderCreatedAsync_WhenCalled_ShouldSendMappedFolderCreatedEvent()
    {
        var parentFolderId = Guid.NewGuid();
        var folder = new Folder(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Finance",
            "Financial documents",
            parentFolderId,
            4,
            "📁");

        await sut.SendFolderCreatedAsync(folder);

        AssertSentEvent<FolderCreatedEvent>(
            nameof(ChatHub.OnFolderCreated),
            @event =>
            {
                @event.FolderId.Should().Be(folder.Id);
                @event.Name.Should().Be(folder.Name);
                @event.Description.Should().Be(folder.Description);
                @event.Emoji.Should().Be(folder.Emoji);
                @event.ParentFolderId.Should().Be(folder.ParentFolderId);
                @event.SortOrder.Should().Be(folder.SortOrder);
            });
    }

    [Test]
    public async Task SendTextAppendedAsync_WhenCalled_ShouldSendTextAppendedEvent()
    {
        var file = CreateFile(version: 2);
        const string text = " appended";

        await sut.SendTextAppendedAsync(file, text);

        AssertSentEvent<TextAppendedEvent>(
            nameof(ChatHub.OnTextAppended),
            @event =>
            {
                @event.FileId.Should().Be(file.Id);
                @event.Text.Should().Be(text);
                @event.Version.Should().Be(file.Version);
            });
    }

    [Test]
    public async Task SendTextPrependedAsync_WhenCalled_ShouldSendTextPrependedEvent()
    {
        var file = CreateFile(version: 4);
        const string text = "prefix ";

        await sut.SendTextPrependedAsync(file, text);

        AssertSentEvent<TextPrependedEvent>(
            nameof(ChatHub.OnTextPrepended),
            @event =>
            {
                @event.FileId.Should().Be(file.Id);
                @event.Text.Should().Be(text);
                @event.Version.Should().Be(file.Version);
            });
    }

    [Test]
    public async Task SendAttachmentSavedAsync_WhenCalled_ShouldSendAttachmentSavedEvent()
    {
        var attachment = new ChatAttachment(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "notes.txt",
            "text/plain",
            256);

        await sut.SendAttachmentSavedAsync(attachment);

        AssertSentEvent<AttachmentSavedEvent>(
            nameof(ChatHub.OnAttachmentSaved),
            @event =>
            {
                @event.AttachmentId.Should().Be(attachment.Id);
                @event.FileName.Should().Be(attachment.FileName);
                @event.ContentType.Should().Be(attachment.ContentType);
                @event.SizeBytes.Should().Be(attachment.SizeBytes);
            });
    }

    [Test]
    public async Task SendProcessingCompletedAsync_WhenCalled_ShouldSendProcessingCompletedEvent()
    {
        var operationId = Guid.NewGuid();

        await sut.SendProcessingCompletedAsync(operationId);

        AssertSentEvent<ProcessingCompletedEvent>(
            nameof(ChatHub.OnProcessingCompleted),
            @event => @event.OperationId.Should().Be(operationId));
    }

    [Test]
    public async Task SendProcessingFailedAsync_WhenErrorCodeIsKnown_ShouldParseAndSendMatchedCode()
    {
        var operationId = Guid.NewGuid();

        await sut.SendProcessingFailedAsync(operationId, "rate limited", "llmratelimited");

        AssertSentEvent<ProcessingFailedEvent>(
            nameof(ChatHub.OnProcessingFailed),
            @event =>
            {
                @event.OperationId.Should().Be(operationId);
                @event.Error.Should().Be("rate limited");
                @event.Code.Should().Be(ProcessingErrorCode.LlmRateLimited);
            });
    }

    [Test]
    public async Task SendProcessingFailedAsync_WhenErrorCodeIsUnknown_ShouldFallbackToInternalError()
    {
        var operationId = Guid.NewGuid();

        await sut.SendProcessingFailedAsync(operationId, "boom", "something_else");

        AssertSentEvent<ProcessingFailedEvent>(
            nameof(ChatHub.OnProcessingFailed),
            @event =>
            {
                @event.OperationId.Should().Be(operationId);
                @event.Error.Should().Be("boom");
                @event.Code.Should().Be(ProcessingErrorCode.InternalError);
            });
    }

    private void AssertSentEvent<TEvent>(
        string methodName,
        Action<TEvent> assertEvent,
        CancellationToken expectedCancellationToken = default)
    {
        var call = clientProxy.ReceivedCalls().Single();
        var arguments = call.GetArguments();

        arguments[0].Should().Be(methodName);
        arguments[1].Should().BeOfType<object?[]>();
        arguments[2].Should().Be(expectedCancellationToken);

        var payload = (object?[])arguments[1]!;
        payload.Should().HaveCount(1);
        payload[0].Should().BeOfType<TEvent>();

        assertEvent((TEvent)payload[0]!);
    }

    private static FileEntity CreateFile(
        Guid? fileId = null,
        Guid? folderId = null,
        string name = "file.txt",
        string description = "description",
        string contentType = "text/plain",
        long sizeBytes = 128,
        int version = 1,
        string? checksumSha256 = null,
        int sortOrder = 0,
        DateTimeOffset? createdAt = null)
    {
        return new FileEntity(
            fileId ?? Guid.NewGuid(),
            folderId ?? Guid.NewGuid(),
            name,
            description,
            contentType,
            sizeBytes,
            version,
            checksumSha256,
            sortOrder,
            createdAt);
    }
}
