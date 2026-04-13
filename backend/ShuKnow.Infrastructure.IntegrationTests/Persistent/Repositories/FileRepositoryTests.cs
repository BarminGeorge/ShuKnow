using Ardalis.Result;
using AwesomeAssertions;
using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Entities;
using ShuKnow.Infrastructure.Persistent.Repositories;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Infrastructure.IntegrationTests.Persistent.Repositories;

public class FileRepositoryTests : BaseRepositoryTests
{
    private FileRepository sut = null!;

    public override async Task SetUp()
    {
        await base.SetUp();
        sut = new FileRepository(Context);
    }

    [Test]
    public async Task GetByIdAsync_WhenFileExistsForUser_ShouldReturnFileWithoutTracking()
    {
        var user = await SeedUserAsync();
        var folder = await SeedFolderAsync(user.Id, "Docs");
        var file = await SeedFileAsync(user.Id, folder.Id, "report.pdf", description: "Quarterly report");

        var result = await sut.GetByIdAsync(file.Id, user.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Id.Should().Be(file.Id);
        result.Value.UserId.Should().Be(user.Id);
        result.Value.FolderId.Should().Be(folder.Id);
        result.Value.Name.Should().Be("report.pdf");
        result.Value.Description.Should().Be("Quarterly report");
        Context.ChangeTracker.Entries<File>().Should().BeEmpty();
    }

    [Test]
    public async Task GetByIdForUpdateAsync_WhenFileExistsForUser_ShouldReturnTrackedFile()
    {
        var user = await SeedUserAsync();
        var file = await SeedFileAsync(user.Id, null, "draft.txt");

        var result = await sut.GetByIdForUpdateAsync(file.Id, user.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Id.Should().Be(file.Id);
        Context.ChangeTracker.Entries<File>().Should().ContainSingle(entry =>
            entry.Entity.Id == file.Id && entry.State == EntityState.Unchanged);
    }

    [Test]
    public async Task GetByIdAsync_WhenFileBelongsToAnotherUser_ShouldReturnNotFound()
    {
        var user = await SeedUserAsync();
        var otherUser = await SeedUserAsync();
        var file = await SeedFileAsync(otherUser.Id, null, "private.txt");

        var result = await sut.GetByIdAsync(file.Id, user.Id);

        result.Status.Should().Be(ResultStatus.NotFound);
    }

    [Test]
    public async Task ListByFolderAsync_ShouldReturnPagedFilesOrderedByNameForFolderAndUser()
    {
        var user = await SeedUserAsync();
        var otherUser = await SeedUserAsync();
        var folder = await SeedFolderAsync(user.Id, "Inbox");
        var otherFolder = await SeedFolderAsync(user.Id, "Archive");

        await SeedFileAsync(user.Id, folder.Id, "delta.txt");
        var alpha = await SeedFileAsync(user.Id, folder.Id, "alpha.txt");
        var beta = await SeedFileAsync(user.Id, folder.Id, "beta.txt");
        await SeedFileAsync(user.Id, otherFolder.Id, "gamma.txt");
        await SeedFileAsync(otherUser.Id, folder.Id, "aardvark.txt");

        var result = await sut.ListByFolderAsync(folder.Id, user.Id, page: 1, pageSize: 2);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.TotalCount.Should().Be(3);
        result.Value.Files.Select(file => file.Id).Should().BeEquivalentTo(
            [alpha.Id, beta.Id],
            options => options.WithStrictOrdering());
    }

    [Test]
    public async Task ExistsByNameInFolderAsync_ShouldRespectExcludeId()
    {
        var user = await SeedUserAsync();
        var folder = await SeedFolderAsync(user.Id, "Inbox");
        var file = await SeedFileAsync(user.Id, folder.Id, "report.pdf");

        var existsResult = await sut.ExistsByNameInFolderAsync("report.pdf", folder.Id, user.Id);
        var excludedResult = await sut.ExistsByNameInFolderAsync("report.pdf", folder.Id, user.Id, file.Id);

        existsResult.Status.Should().Be(ResultStatus.Ok);
        excludedResult.Status.Should().Be(ResultStatus.Ok);
        existsResult.Value.Should().BeTrue();
        excludedResult.Value.Should().BeFalse();
    }

    [Test]
    public async Task CountByFolderAsync_ShouldCountOnlyRootFilesForUserWhenFolderIsNull()
    {
        var user = await SeedUserAsync();
        var otherUser = await SeedUserAsync();
        var folder = await SeedFolderAsync(user.Id, "Inbox");

        await SeedFileAsync(user.Id, null, "root-a.txt");
        await SeedFileAsync(user.Id, null, "root-b.txt");
        await SeedFileAsync(user.Id, folder.Id, "folder-file.txt");
        await SeedFileAsync(otherUser.Id, null, "foreign-root.txt");

        var result = await sut.CountByFolderAsync(null, user.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().Be(2);
    }

    [Test]
    public async Task AddUpdateDelete_ShouldPersistExpectedChanges()
    {
        var user = await SeedUserAsync();
        var folder = await SeedFolderAsync(user.Id, "Docs");
        var fileId = Guid.NewGuid();
        var blobId = Guid.NewGuid();
        var createdAt = new DateTimeOffset(2026, 04, 08, 12, 0, 0, TimeSpan.Zero);
        var created = new File(
            fileId,
            user.Id,
            folder.Id,
            "draft.txt",
            "Initial version",
            "text/plain",
            12,
            version: 1,
            checksumSha256: "checksum-v1",
            sortOrder: 3,
            createdAt: createdAt)
        {
            BlobId = blobId
        };

        (await sut.AddAsync(created)).Status.Should().Be(ResultStatus.Ok);
        await Context.SaveChangesAsync();
        Context.ChangeTracker.Clear();

        var updated = new File(
            fileId,
            user.Id,
            null,
            "final.txt",
            "Updated version",
            "text/markdown",
            64,
            version: 2,
            checksumSha256: "checksum-v2",
            sortOrder: 1,
            createdAt: createdAt)
        {
            BlobId = blobId
        };

        (await sut.UpdateAsync(updated)).Status.Should().Be(ResultStatus.Ok);
        await Context.SaveChangesAsync();

        await using (var assertContext = CreateDbContext())
        {
            var persisted = await assertContext.Files.SingleAsync(file => file.Id == fileId);
            persisted.UserId.Should().Be(user.Id);
            persisted.FolderId.Should().BeNull();
            persisted.Name.Should().Be("final.txt");
            persisted.Description.Should().Be("Updated version");
            persisted.ContentType.Should().Be("text/markdown");
            persisted.SizeBytes.Should().Be(64);
            persisted.Version.Should().Be(2);
            persisted.ChecksumSha256.Should().Be("checksum-v2");
            persisted.SortOrder.Should().Be(1);
            persisted.BlobId.Should().Be(blobId);
            persisted.CreatedAt.Should().Be(createdAt);
        }

        (await sut.DeleteAsync(fileId, user.Id)).Status.Should().Be(ResultStatus.Ok);
        await Context.SaveChangesAsync();

        await using var verifyDeletedContext = CreateDbContext();
        (await verifyDeletedContext.Files.AnyAsync(file => file.Id == fileId)).Should().BeFalse();
    }

    [Test]
    public async Task DeleteAsync_WhenFileDoesNotExist_ShouldReturnNotFound()
    {
        var result = await sut.DeleteAsync(Guid.NewGuid(), Guid.NewGuid());
        await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.NotFound);
    }

    [Test]
    public async Task DeleteAsync_WhenFileBelongsToAnotherUser_ShouldReturnNotFound()
    {
        var user = await SeedUserAsync();
        var otherUser = await SeedUserAsync();
        var file = await SeedFileAsync(otherUser.Id, null, "private.txt");

        var result = await sut.DeleteAsync(file.Id, user.Id);
        await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.NotFound);

        await using var assertContext = CreateDbContext();
        (await assertContext.Files.AnyAsync(existingFile => existingFile.Id == file.Id)).Should().BeTrue();
    }

    [Test]
    public async Task DeleteByFolderAsync_ShouldDeleteOnlyMatchingFolderFilesAndReturnDeletedList()
    {
        var user = await SeedUserAsync();
        var otherUser = await SeedUserAsync();
        var folder = await SeedFolderAsync(user.Id, "Inbox");
        var otherFolder = await SeedFolderAsync(user.Id, "Archive");
        var alpha = await SeedFileAsync(user.Id, folder.Id, "alpha.txt");
        var beta = await SeedFileAsync(user.Id, folder.Id, "beta.txt");
        await SeedFileAsync(user.Id, otherFolder.Id, "keep.txt");
        await SeedFileAsync(otherUser.Id, folder.Id, "foreign.txt");

        var result = await sut.DeleteByFolderAsync(folder.Id, user.Id);
        await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Select(file => file.Id).Should().BeEquivalentTo([alpha.Id, beta.Id]);

        await using var assertContext = CreateDbContext();
        (await assertContext.Files.AnyAsync(file => file.Id == alpha.Id)).Should().BeFalse();
        (await assertContext.Files.AnyAsync(file => file.Id == beta.Id)).Should().BeFalse();
        (await assertContext.Files.AnyAsync(file => file.Name == "keep.txt")).Should().BeTrue();
        (await assertContext.Files.AnyAsync(file => file.Name == "foreign.txt")).Should().BeTrue();
    }

    [Test]
    public async Task GetByFolderAsync_WhenFolderIsNull_ShouldReturnRootFilesOrderedByName()
    {
        var user = await SeedUserAsync();
        var folder = await SeedFolderAsync(user.Id, "Docs");
        var alpha = await SeedFileAsync(user.Id, null, "alpha.txt");
        var beta = await SeedFileAsync(user.Id, null, "beta.txt");
        await SeedFileAsync(user.Id, folder.Id, "nested.txt");

        var result = await sut.GetByFolderAsync(null, user.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Select(file => file.Id).Should().BeEquivalentTo(
            [alpha.Id, beta.Id],
            options => options.WithStrictOrdering());
    }

    [Test]
    public async Task GetExistingBlobIdsAsync_WhenBlobIdsExist_ShouldReturnExistingBlobIds()
    {
        var user = await SeedUserAsync();
        var blobId1 = Guid.NewGuid();
        var blobId2 = Guid.NewGuid();
        var blobId3 = Guid.NewGuid();

        await SeedFileAsync(user.Id, null, "file1.txt", blobId: blobId1);
        await SeedFileAsync(user.Id, null, "file2.txt", blobId: blobId2);

        var result = await sut.GetExistingBlobIdsAsync([blobId1, blobId2, blobId3]);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeEquivalentTo([blobId1, blobId2]);
    }

    [Test]
    public async Task GetExistingBlobIdsAsync_WhenNoBlobIdsProvided_ShouldReturnEmptySet()
    {
        var result = await sut.GetExistingBlobIdsAsync([]);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeEmpty();
    }

    [Test]
    public async Task GetExistingBlobIdsAsync_WhenNoBlobIdsMatch_ShouldReturnEmptySet()
    {
        var user = await SeedUserAsync();
        var nonExistentBlobId1 = Guid.NewGuid();
        var nonExistentBlobId2 = Guid.NewGuid();

        await SeedFileAsync(user.Id, null, "file.txt", blobId: Guid.NewGuid());

        var result = await sut.GetExistingBlobIdsAsync([nonExistentBlobId1, nonExistentBlobId2]);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeEmpty();
    }

    [Test]
    public async Task GetExistingBlobIdsAsync_WhenDuplicateBlobIdsInDatabase_ShouldReturnDistinctSet()
    {
        var user = await SeedUserAsync();
        var blobId = Guid.NewGuid();

        await SeedFileAsync(user.Id, null, "file1.txt", blobId: blobId);
        await SeedFileAsync(user.Id, null, "file2.txt", blobId: blobId);
        await SeedFileAsync(user.Id, null, "file3.txt", blobId: blobId);

        var result = await sut.GetExistingBlobIdsAsync([blobId]);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().ContainSingle().Which.Should().Be(blobId);
    }

    [Test]
    public async Task GetExistingBlobIdsAsync_WhenMultipleFilesShareBlobIds_ShouldReturnOnlyUniqueBlobIds()
    {
        var user = await SeedUserAsync();
        var blobId1 = Guid.NewGuid();
        var blobId2 = Guid.NewGuid();

        await SeedFileAsync(user.Id, null, "file1a.txt", blobId: blobId1);
        await SeedFileAsync(user.Id, null, "file1b.txt", blobId: blobId1);
        await SeedFileAsync(user.Id, null, "file2a.txt", blobId: blobId2);
        await SeedFileAsync(user.Id, null, "file2b.txt", blobId: blobId2);

        var result = await sut.GetExistingBlobIdsAsync([blobId1, blobId2]);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeEquivalentTo([blobId1, blobId2]);
        result.Value.Count.Should().Be(2);
    }

    [Test]
    public async Task GetExistingBlobIdsAsync_ShouldRespectCancellationToken()
    {
        var user = await SeedUserAsync();
        var blobId = Guid.NewGuid();
        await SeedFileAsync(user.Id, null, "file.txt", blobId: blobId);

        using var cts = new CancellationTokenSource();

        var result = await sut.GetExistingBlobIdsAsync([blobId], cts.Token);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().Contain(blobId);
    }

    private async Task<User> SeedUserAsync(Guid? userId = null)
    {
        var user = new User(userId ?? Guid.NewGuid(), "test_user");

        await using var seedContext = CreateDbContext();
        seedContext.Users.Add(user);
        await seedContext.SaveChangesAsync();

        return user;
    }

    private async Task<Folder> SeedFolderAsync(
        Guid userId,
        string name,
        string description = "",
        Guid? parentFolderId = null,
        int sortOrder = 0,
        Guid? folderId = null)
    {
        var folder = new Folder(folderId ?? Guid.NewGuid(), userId, name, description, parentFolderId, sortOrder);

        await using var seedContext = CreateDbContext();
        seedContext.Folders.Add(folder);
        await seedContext.SaveChangesAsync();

        return folder;
    }

    private async Task<File> SeedFileAsync(
        Guid userId,
        Guid? folderId,
        string name,
        string description = "description",
        string contentType = "text/plain",
        long sizeBytes = 128,
        int version = 1,
        string? checksumSha256 = null,
        int sortOrder = 0,
        Guid? fileId = null,
        Guid? blobId = null,
        DateTimeOffset? createdAt = null)
    {
        var file = new File(
            fileId ?? Guid.NewGuid(),
            userId,
            folderId,
            name,
            description,
            contentType,
            sizeBytes,
            version,
            checksumSha256,
            sortOrder,
            createdAt)
        {
            BlobId = blobId ?? Guid.NewGuid()
        };

        await using var seedContext = CreateDbContext();
        seedContext.Files.Add(file);
        await seedContext.SaveChangesAsync();

        return file;
    }
}
