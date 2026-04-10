using Ardalis.Result;
using AwesomeAssertions;
using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Entities;
using ShuKnow.Infrastructure.Persistent.Repositories;

namespace ShuKnow.Infrastructure.IntegrationTests.Persistent.Repositories;

public class ChatMessageRepositoryTests : BaseRepositoryTests
{
    private ChatMessageRepository sut = null!;

    public override async Task SetUp()
    {
        await base.SetUp();
        sut = new ChatMessageRepository(Context);
    }

    [Test]
    public async Task WithMixedNullAndNonNullIndexes_ShouldReturnCorrectOrderAndPages()
    {
        var user = await SeedUserAsync();
        var session = await SeedSessionAsync(user.Id);

        await SeedMessagesAsync(session.Id, null, null, 1, 2, null, 3);
        
        var expectedOrder = await GetExpectedOrderAsync(session.Id);

        var page1 = await sut.GetPageAsync(session.Id, null, 3);
        page1.Status.Should().Be(ResultStatus.Ok);
        page1.Value.Messages.Select(m => m.Id).Should().BeEquivalentTo(expectedOrder.Take(3).Select(m => m.Id), options => options.WithStrictOrdering());
        page1.Value.NextCursor.Should().NotBeNull();

        var page2 = await sut.GetPageAsync(session.Id, page1.Value.NextCursor, 3);
        page2.Status.Should().Be(ResultStatus.Ok);
        page2.Value.Messages.Select(m => m.Id).Should().BeEquivalentTo(expectedOrder.Skip(3).Take(3).Select(m => m.Id), options => options.WithStrictOrdering());
        page2.Value.NextCursor.Should().BeNull();
    }

    [Test]
    public async Task WithDuplicateIndexes_ShouldUseIdAsTieBreaker()
    {
        var user = await SeedUserAsync();
        var session = await SeedSessionAsync(user.Id);

        await SeedMessagesAsync(session.Id, 5, 5, 5, 5, 5);
        
        var expectedOrder = await GetExpectedOrderAsync(session.Id);

        var page1 = await sut.GetPageAsync(session.Id, null, 2);
        page1.Value.Messages.Select(m => m.Id).Should().BeEquivalentTo(expectedOrder.Take(2).Select(m => m.Id), options => options.WithStrictOrdering());

        var page2 = await sut.GetPageAsync(session.Id, page1.Value.NextCursor, 2);
        page2.Value.Messages.Select(m => m.Id).Should().BeEquivalentTo(expectedOrder.Skip(2).Take(2).Select(m => m.Id), options => options.WithStrictOrdering());

        var page3 = await sut.GetPageAsync(session.Id, page2.Value.NextCursor, 2);
        page3.Value.Messages.Select(m => m.Id).Should().BeEquivalentTo(expectedOrder.Skip(4).Take(2).Select(m => m.Id), options => options.WithStrictOrdering());
        page3.Value.NextCursor.Should().BeNull();
    }

    [Test]
    public async Task AtPageBoundary_ShouldNotDropOrDuplicate()
    {
        var user = await SeedUserAsync();
        var session = await SeedSessionAsync(user.Id);

        await SeedMessagesAsync(session.Id, null, 1, 1, 2);
        var expectedOrder = await GetExpectedOrderAsync(session.Id);

        var page1 = await sut.GetPageAsync(session.Id, null, 2);
        var page2 = await sut.GetPageAsync(session.Id, page1.Value.NextCursor, 2);

        var combinedIds = page1.Value.Messages.Select(m => m.Id)
            .Concat(page2.Value.Messages.Select(m => m.Id))
            .ToList();

        combinedIds.Should().BeEquivalentTo(expectedOrder.Select(m => m.Id), options => options.WithStrictOrdering());
        page2.Value.NextCursor.Should().BeNull();
    }
    
    [Test]
    public async Task WithForeignCursor_ShouldReturnInvalid()
    {
        var user1 = await SeedUserAsync();
        var session1 = await SeedSessionAsync(user1.Id);
        
        var user2 = await SeedUserAsync();
        var session2 = await SeedSessionAsync(user2.Id);

        await SeedMessagesAsync(session1.Id, 1, 2);
        var s1Page = await sut.GetPageAsync(session1.Id, null, 1);
        
        var foreignCursor = s1Page.Value.NextCursor;

        var s2Page = await sut.GetPageAsync(session2.Id, foreignCursor, 1);

        s2Page.Status.Should().Be(ResultStatus.Invalid);
    }
    
    [Test]
    public async Task WithMalformedCursor_ShouldReturnInvalid()
    {
        var user = await SeedUserAsync();
        var session = await SeedSessionAsync(user.Id);

        var result = await sut.GetPageAsync(session.Id, "garbage_base64_string!^&", 10);

        result.Status.Should().Be(ResultStatus.Invalid);
    }

    private async Task<User> SeedUserAsync()
    {
        var user = new User(Guid.NewGuid(), "testuser_" + Guid.NewGuid());
        await using var seedContext = CreateDbContext();
        seedContext.Users.Add(user);
        await seedContext.SaveChangesAsync();
        return user;
    }

    private async Task<ChatSession> SeedSessionAsync(Guid userId)
    {
        var session = new ChatSession(Guid.NewGuid(), userId);
        await using var seedContext = CreateDbContext();
        seedContext.ChatSessions.Add(session);
        await seedContext.SaveChangesAsync();
        return session;
    }

    private async Task SeedMessagesAsync(Guid sessionId, params int?[] indexes)
    {
        await using var seedContext = CreateDbContext();
        foreach (var index in indexes)
        {
            var msg = ChatMessage.CreateUserMessage(sessionId, $"Message {index}", index);
            seedContext.ChatMessages.Add(msg);
        }
        await seedContext.SaveChangesAsync();
    }

    private async Task<List<ChatMessage>> GetExpectedOrderAsync(Guid sessionId)
    {
        await using var ctx = CreateDbContext();
        return await ctx.ChatMessages
            .Where(m => m.SessionId == sessionId)
            .OrderBy(m => m.Index)
            .ThenBy(m => m.Id)
            .ToListAsync();
    }
}
