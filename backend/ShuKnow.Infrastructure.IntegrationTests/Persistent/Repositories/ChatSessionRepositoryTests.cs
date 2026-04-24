using Ardalis.Result;
using AwesomeAssertions;
using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Enums;
using ShuKnow.Infrastructure.Persistent.Repositories;

namespace ShuKnow.Infrastructure.IntegrationTests.Persistent.Repositories;

public class ChatSessionRepositoryTests : BaseRepositoryTests
{
    private ChatSessionRepository sut = null!;
    
    public override async Task SetUp()
    {
        await base.SetUp();
        sut = new ChatSessionRepository(Context);
    }

    [Test]
    public async Task AddAsync_WhenCommitted_ShouldPersistSession()
    {
        var user = await SeedUserAsync();
        var session = new ChatSession(Guid.NewGuid(), user.Id);

        var result = await sut.AddAsync(session);
        await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.Ok);

        await using var assertContext = CreateDbContext();
        var persistedSession = await assertContext.ChatSessions.SingleAsync(existing => existing.Id == session.Id);

        persistedSession.UserId.Should().Be(user.Id);
        persistedSession.Status.Should().Be(ChatSessionStatus.Active);
    }

    [Test]
    public async Task DeleteAsync_WhenSessionIsTracked_ShouldDeleteSession()
    {
        var user = await SeedUserAsync();
        var session = await SeedSessionAsync(user.Id);
        var trackedSession = await Context.ChatSessions.SingleAsync(existing => existing.Id == session.Id);

        var result = await sut.DeleteAsync(session.Id);
        await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        Context.Entry(trackedSession).State.Should().Be(EntityState.Detached);

        await using var assertContext = CreateDbContext();
        var exists = await assertContext.ChatSessions.AnyAsync(existing => existing.Id == session.Id);
        exists.Should().BeFalse();
    }

    [Test]
    public async Task DeleteAsync_WhenSessionIsNotTracked_ShouldDeleteSession()
    {
        var user = await SeedUserAsync();
        var session = await SeedSessionAsync(user.Id);

        var result = await sut.DeleteAsync(session.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        Context.ChangeTracker.Entries<ChatSession>().Should().ContainSingle(entry =>
            entry.Entity.Id == session.Id && entry.State == EntityState.Deleted);

        await Context.SaveChangesAsync();

        await using var assertContext = CreateDbContext();
        var exists = await assertContext.ChatSessions.AnyAsync(existing => existing.Id == session.Id);
        exists.Should().BeFalse();
    }

    private async Task<User> SeedUserAsync(Guid? userId = null)
    {
        var user = new User(userId ?? Guid.NewGuid(), "testuser");

        await using var seedContext = CreateDbContext();
        seedContext.Users.Add(user);
        await seedContext.SaveChangesAsync();

        return user;
    }

    private async Task<ChatSession> SeedSessionAsync(
        Guid userId,
        ChatSessionStatus status = ChatSessionStatus.Active,
        Guid? sessionId = null)
    {
        var session = new ChatSession(sessionId ?? Guid.NewGuid(), userId, status);

        await using var seedContext = CreateDbContext();
        seedContext.ChatSessions.Add(session);
        await seedContext.SaveChangesAsync();

        return session;
    }
}
