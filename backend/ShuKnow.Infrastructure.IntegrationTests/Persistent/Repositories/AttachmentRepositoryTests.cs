using System.Reflection;
using Ardalis.Result;
using AwesomeAssertions;
using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Entities;
using ShuKnow.Infrastructure.Persistent.Repositories;

namespace ShuKnow.Infrastructure.IntegrationTests.Persistent.Repositories;

public class AttachmentRepositoryTests : BaseRepositoryTests
{
    private AttachmentRepository sut = null!;

    public override async Task SetUp()
    {
        await base.SetUp();
        sut = new AttachmentRepository(Context);
    }

    [Test]
    public async Task GetByIdsAsync_WhenAttachmentsExist_ShouldReturnOnlyUserOwnedAttachments()
    {
        var user = await SeedUserAsync();
        var otherUser = await SeedUserAsync();
        var attachment1 = await SeedAttachmentAsync(user.Id);
        var attachment2 = await SeedAttachmentAsync(user.Id);
        var otherUserAttachment = await SeedAttachmentAsync(otherUser.Id);

        var result = await sut.GetByIdsAsync([attachment1.Id, attachment2.Id, otherUserAttachment.Id], user.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().HaveCount(2);
        result.Value.Should().Contain(a => a.Id == attachment1.Id);
        result.Value.Should().Contain(a => a.Id == attachment2.Id);
        result.Value.Should().NotContain(a => a.Id == otherUserAttachment.Id);
    }

    [Test]
    public async Task GetByIdsAsync_WhenNoAttachmentsExist_ShouldReturnEmptyList()
    {
        var user = await SeedUserAsync();

        var result = await sut.GetByIdsAsync([Guid.NewGuid(), Guid.NewGuid()], user.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeEmpty();
    }

    [Test]
    public async Task GetByIdsAsync_WhenEmptyIdsProvided_ShouldReturnEmptyList()
    {
        var user = await SeedUserAsync();
        await SeedAttachmentAsync(user.Id);

        var result = await sut.GetByIdsAsync([], user.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeEmpty();
    }

    [Test]
    public async Task AddRangeAsync_WhenCommitted_ShouldPersistAttachments()
    {
        var user = await SeedUserAsync();
        var attachment1 = new ChatAttachment(Guid.NewGuid(), user.Id, Guid.NewGuid(), "file1.txt", "text/plain", 100);
        var attachment2 = new ChatAttachment(Guid.NewGuid(), user.Id, Guid.NewGuid(), "file2.pdf", "application/pdf", 2000);
        attachment1.SetBlobId(Guid.NewGuid());
        attachment2.SetBlobId(Guid.NewGuid());

        var result = await sut.AddRangeAsync([attachment1, attachment2]);
        await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.Ok);

        await using var assertContext = CreateDbContext();
        var persisted = await assertContext.ChatAttachments
            .Where(a => a.UserId == user.Id)
            .ToListAsync();

        persisted.Should().HaveCount(2);
        persisted.Should().Contain(a => a.FileName == "file1.txt" && a.SizeBytes == 100);
        persisted.Should().Contain(a => a.FileName == "file2.pdf" && a.SizeBytes == 2000);
    }

    [Test]
    public async Task AddRangeAsync_WhenUserDoesNotExist_ShouldFailOnSave()
    {
        var nonExistentUserId = Guid.NewGuid();
        var attachment = new ChatAttachment(Guid.NewGuid(), nonExistentUserId, Guid.NewGuid(), "file.txt", "text/plain", 100);
        attachment.SetBlobId(Guid.NewGuid());

        var result = await sut.AddRangeAsync([attachment]);
        var act = async () => await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        await act.Should().ThrowAsync<DbUpdateException>();
    }

    [Test]
    public async Task MarkConsumedAsync_WhenCommitted_ShouldUpdateIsConsumedFlag()
    {
        var user = await SeedUserAsync();
        var attachment1 = await SeedAttachmentAsync(user.Id);
        var attachment2 = await SeedAttachmentAsync(user.Id);
        var attachment3 = await SeedAttachmentAsync(user.Id);

        var result = await sut.MarkConsumedAsync([attachment1.Id, attachment2.Id]);
        await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.Ok);

        await using var assertContext = CreateDbContext();
        var all = await assertContext.ChatAttachments.ToListAsync();

        all.Single(a => a.Id == attachment1.Id).IsConsumed.Should().BeTrue();
        all.Single(a => a.Id == attachment2.Id).IsConsumed.Should().BeTrue();
        all.Single(a => a.Id == attachment3.Id).IsConsumed.Should().BeFalse();
    }

    [Test]
    public async Task MarkConsumedAsync_WhenIdsDoNotExist_ShouldSucceedWithoutChanges()
    {
        var result = await sut.MarkConsumedAsync([Guid.NewGuid(), Guid.NewGuid()]);
        await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.Ok);
    }

    [Test]
    public async Task MarkConsumedAsync_SingleId_WhenAttachmentExists_ShouldMarkAsConsumed()
    {
        var user = await SeedUserAsync();
        var attachment = await SeedAttachmentAsync(user.Id);

        var result = await sut.MarkConsumedAsync(attachment.Id);
        await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.Ok);

        await using var assertContext = CreateDbContext();
        var persisted = await assertContext.ChatAttachments.FindAsync(attachment.Id);
        persisted!.IsConsumed.Should().BeTrue();
    }

    [Test]
    public async Task MarkConsumedAsync_SingleId_WhenAttachmentDoesNotExist_ShouldReturnNotFound()
    {
        var result = await sut.MarkConsumedAsync(Guid.NewGuid());

        result.Status.Should().Be(ResultStatus.NotFound);
    }

    [Test]
    public async Task GetExpiredUnconsumedAsync_ShouldReturnOnlyExpiredUnconsumed()
    {
        var user = await SeedUserAsync();
        var oldUnconsumed = await SeedAttachmentAsync(user.Id, createdAt: DateTimeOffset.UtcNow.AddHours(-2));
        await SeedAttachmentAsync(user.Id, createdAt: DateTimeOffset.UtcNow.AddHours(-2), isConsumed: true);
        await SeedAttachmentAsync(user.Id, createdAt: DateTimeOffset.UtcNow.AddMinutes(-30));

        var cutoff = DateTimeOffset.UtcNow.AddHours(-1);
        var result = await sut.GetExpiredUnconsumedAsync(cutoff);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().HaveCount(1);
        result.Value.Single().Id.Should().Be(oldUnconsumed.Id);
    }

    [Test]
    public async Task GetExpiredUnconsumedAsync_WhenNoExpired_ShouldReturnEmptyList()
    {
        var user = await SeedUserAsync();
        await SeedAttachmentAsync(user.Id, createdAt: DateTimeOffset.UtcNow.AddMinutes(-30));

        var cutoff = DateTimeOffset.UtcNow.AddHours(-1);
        var result = await sut.GetExpiredUnconsumedAsync(cutoff);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeEmpty();
    }

    [Test]
    public async Task DeleteRangeAsync_ShouldDeleteSpecifiedAttachments()
    {
        var user = await SeedUserAsync();
        var attachment1 = await SeedAttachmentAsync(user.Id);
        var attachment2 = await SeedAttachmentAsync(user.Id);
        var attachment3 = await SeedAttachmentAsync(user.Id);

        var result = await sut.DeleteRangeAsync([attachment1.Id, attachment2.Id]);

        result.Status.Should().Be(ResultStatus.Ok);
        await Context.SaveChangesAsync();
        
        await using var assertContext = CreateDbContext();
        var remaining = await assertContext.ChatAttachments.ToListAsync();

        remaining.Should().HaveCount(1);
        remaining.Single().Id.Should().Be(attachment3.Id);
    }

    [Test]
    public async Task DeleteRangeAsync_WhenIdsDoNotExist_ShouldSucceed()
    {
        var result = await sut.DeleteRangeAsync([Guid.NewGuid(), Guid.NewGuid()]);

        result.Status.Should().Be(ResultStatus.Ok);
    }

    [Test]
    public async Task GetExistingBlobIdsAsync_ShouldReturnOnlyExistingBlobIds()
    {
        var user = await SeedUserAsync();
        var blobId1 = Guid.NewGuid();
        var blobId2 = Guid.NewGuid();
        var blobId3 = Guid.NewGuid();
        await SeedAttachmentAsync(user.Id, blobId: blobId1);
        await SeedAttachmentAsync(user.Id, blobId: blobId2);

        var candidateBlobIds = new[] { blobId1, blobId2, blobId3 };
        var result = await sut.GetExistingBlobIdsAsync(candidateBlobIds);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().HaveCount(2);
        result.Value.Should().Contain(blobId1);
        result.Value.Should().Contain(blobId2);
        result.Value.Should().NotContain(blobId3);
    }

    [Test]
    public async Task GetExistingBlobIdsAsync_WhenNoBlobsExist_ShouldReturnEmptySet()
    {
        var result = await sut.GetExistingBlobIdsAsync([Guid.NewGuid(), Guid.NewGuid()]);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeEmpty();
    }

    [Test]
    public async Task GetExistingBlobIdsAsync_ShouldSupportCancellation()
    {
        var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        var act = async () => await sut.GetExistingBlobIdsAsync([Guid.NewGuid()], cts.Token);

        await act.Should().ThrowAsync<OperationCanceledException>();
    }

    private async Task<User> SeedUserAsync(Guid? userId = null)
    {
        var user = new User(userId ?? Guid.NewGuid(), $"testuser-{Guid.NewGuid():N}");

        await using var seedContext = CreateDbContext();
        seedContext.Users.Add(user);
        await seedContext.SaveChangesAsync();

        return user;
    }

    private async Task<ChatAttachment> SeedAttachmentAsync(
        Guid userId,
        Guid? attachmentId = null,
        Guid? blobId = null,
        string fileName = "test.txt",
        string contentType = "text/plain",
        long sizeBytes = 1024,
        DateTimeOffset? createdAt = null,
        bool isConsumed = false)
    {
        var attachment = new ChatAttachment(
            attachmentId ?? Guid.NewGuid(),
            userId,
            blobId ?? Guid.NewGuid(),
            fileName,
            contentType,
            sizeBytes);
        
        if (isConsumed)
            attachment.MarkAsConsumed();
        if (createdAt.HasValue)
            attachment.SetCreatedAt(createdAt.Value);
        
        await using var seedContext = CreateDbContext();
        seedContext.ChatAttachments.Add(attachment);
        await seedContext.SaveChangesAsync();
        

        return attachment;
    }
}

internal static class AttachmentExtensions
{
    internal static void SetCreatedAt(this ChatAttachment attachment, DateTimeOffset createdAt)
    {
        var property = typeof(ChatAttachment).GetProperty("CreatedAt", BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance);
        property?.SetValue(attachment, createdAt);
    }
}
