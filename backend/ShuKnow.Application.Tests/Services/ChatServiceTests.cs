using Ardalis.Result;
using AwesomeAssertions;
using NSubstitute;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Services;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Application.Tests.Services;

public class ChatServiceTests
{
    private IChatSessionRepository chatSessionRepository = null!;
    private IChatMessageRepository chatMessageRepository = null!;
    private ICurrentUserService currentUserService = null!;
    private IUnitOfWork unitOfWork = null!;
    private Guid currentUserId;
    private ChatService sut = null!;

    [SetUp]
    public void SetUp()
    {
        chatSessionRepository = Substitute.For<IChatSessionRepository>();
        chatMessageRepository = Substitute.For<IChatMessageRepository>();
        currentUserService = Substitute.For<ICurrentUserService>();
        unitOfWork = Substitute.For<IUnitOfWork>();
        currentUserId = Guid.NewGuid();

        currentUserService.UserId.Returns(currentUserId);
        ConfigureDefaults();

        sut = new ChatService(
            chatSessionRepository,
            chatMessageRepository,
            currentUserService,
            unitOfWork);
    }

    [Test]
    public async Task GetOrCreateActiveSessionAsync_WhenActiveSessionExists_ShouldReturnExistingSession()
    {
        var session = CreateSession();
        chatSessionRepository.GetActiveAsync(currentUserId).Returns(Success(session));

        var result = await sut.GetOrCreateActiveSessionAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(session);
        await chatSessionRepository.DidNotReceive().AddAsync(Arg.Any<ChatSession>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task GetOrCreateActiveSessionAsync_WhenActiveSessionNotFound_ShouldCreateAndPersistSession()
    {
        ChatSession? persistedSession = null;
        chatSessionRepository.AddAsync(Arg.Do<ChatSession>(session => persistedSession = session))
            .Returns(Success());

        var result = await sut.GetOrCreateActiveSessionAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        persistedSession.Should().NotBeNull();
        result.Value.Should().BeSameAs(persistedSession);
        result.Value.UserId.Should().Be(currentUserId);
        await chatSessionRepository.Received(1).AddAsync(Arg.Any<ChatSession>());
        await unitOfWork.Received(1).SaveChangesAsync();
    }
    
    [Test]
    public async Task GetOrCreateActiveSessionAsync_WhenActiveSessionReturnsError_ShouldReturnError()
    {
        var error = Result.Error();
        chatSessionRepository.GetActiveAsync(currentUserId).Returns(error);

        var result = await sut.GetOrCreateActiveSessionAsync();

        result.Status.Should().Be(error.Status);
        await chatSessionRepository.DidNotReceive().AddAsync(Arg.Any<ChatSession>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task DeleteSessionAsync_WhenNoActiveSessionExists_ShouldReturnNotFoundWithoutPersistingChanges()
    {
        var result = await sut.DeleteSessionAsync();

        result.Status.Should().Be(ResultStatus.NotFound);
        await chatMessageRepository.DidNotReceive().DeleteBySessionAsync(Arg.Any<Guid>());
        await chatSessionRepository.DidNotReceive().DeleteAsync(Arg.Any<Guid>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task DeleteSessionAsync_WhenActiveSessionExists_ShouldDeleteMessagesAndSession()
    {
        var session = CreateSession();
        chatSessionRepository.GetActiveAsync(currentUserId).Returns(Success(session));

        var result = await sut.DeleteSessionAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        await chatMessageRepository.Received(1).DeleteBySessionAsync(session.Id);
        await chatSessionRepository.Received(1).DeleteAsync(session.Id);
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task GetMessagesAsync_WhenLimitIsOutsideAllowedRange_ShouldReturnError()
    {
        var result = await sut.GetMessagesAsync(cursor: null, limit: 0);

        result.Status.Should().Be(ResultStatus.Error);
        await chatSessionRepository.DidNotReceive().GetActiveAsync(Arg.Any<Guid>());
        await chatMessageRepository.DidNotReceive().GetPageAsync(Arg.Any<Guid>(), Arg.Any<string?>(), Arg.Any<int>());
    }

    [Test]
    public async Task GetMessagesAsync_WhenCalled_ShouldReturnRepositoryPageForActiveSession()
    {
        var session = CreateSession();
        var message = ChatMessage.CreateUserMessage(session.Id, "hello");
        const string cursor = "cursor-1";
        const string nextCursor = "cursor-2";

        chatSessionRepository.GetActiveAsync(currentUserId).Returns(Success(session));
        chatMessageRepository.GetPageAsync(session.Id, cursor, 25)
            .Returns(Success<(IReadOnlyList<ChatMessage> Messages, string? NextCursor)>(([message], nextCursor)));

        var result = await sut.GetMessagesAsync(cursor, 25);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Messages.Should().BeEquivalentTo([message]);
        result.Value.NextCursor.Should().Be(nextCursor);
        await chatMessageRepository.Received(1).GetPageAsync(session.Id, cursor, 25);
    }

    [Test]
    public async Task PersistMessageAsync_WhenSessionDoesNotExist_ShouldReturnNotFound()
    {
        var session = CreateSession();
        var message = ChatMessage.CreateUserMessage(session.Id, "hello");

        var result = await sut.PersistMessageAsync(message);

        result.Status.Should().Be(ResultStatus.NotFound);
        await chatMessageRepository.DidNotReceive().AddAsync(Arg.Any<ChatMessage>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task PersistMessageAsync_WhenMessageTargetsDifferentSession_ShouldReturnNotFound()
    {
        var activeSession = CreateSession();
        var anotherSessionId = Guid.NewGuid();
        var message = ChatMessage.CreateAiMessage(Guid.NewGuid(), anotherSessionId, "response");

        chatSessionRepository.GetActiveAsync(currentUserId).Returns(Success(activeSession));

        var result = await sut.PersistMessageAsync(message);

        result.Status.Should().Be(ResultStatus.NotFound);
        await chatMessageRepository.DidNotReceive().AddAsync(Arg.Any<ChatMessage>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    private void ConfigureDefaults()
    {
        unitOfWork.SaveChangesAsync().Returns(Success());
        chatSessionRepository.GetActiveAsync(Arg.Any<Guid>()).Returns(NotFound<ChatSession>());
        chatSessionRepository.AddAsync(Arg.Any<ChatSession>()).Returns(Success());
        chatSessionRepository.DeleteAsync(Arg.Any<Guid>()).Returns(Success());
        chatMessageRepository.AddAsync(Arg.Any<ChatMessage>()).Returns(Success());
        chatMessageRepository.DeleteBySessionAsync(Arg.Any<Guid>()).Returns(Success());
        chatMessageRepository.GetPageAsync(Arg.Any<Guid>(), Arg.Any<string?>(), Arg.Any<int>())
            .Returns(Success<(IReadOnlyList<ChatMessage> Messages, string? NextCursor)>(([], null)));
    }

    private ChatSession CreateSession(Guid? sessionId = null)
    {
        return new ChatSession(sessionId ?? Guid.NewGuid(), currentUserId);
    }

    private static Task<Result> Success()
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
}
