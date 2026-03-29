using Ardalis.Result;
using AwesomeAssertions;
using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Entities;
using ShuKnow.Infrastructure.Persistent.Repositories;

namespace ShuKnow.Infrastructure.IntegrationTests.Persistent.Repositories;

public class FolderRepositoryTests : BaseRepositoryTests
{
    private FolderRepository sut = null!;

    public override async Task SetUp()
    {
        await base.SetUp();
        sut = new FolderRepository(Context);
    }

    [Test]
    public async Task GetByIdAsync_WhenFolderExistsForUser_ShouldReturnFolderWithoutTracking()
    {
        var user = await SeedUserAsync();
        var folder = await SeedFolderAsync(user.Id, "Inbox");

        var result = await sut.GetByIdAsync(folder.Id, user.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Id.Should().Be(folder.Id);
        result.Value.Name.Should().Be("Inbox");
        Context.ChangeTracker.Entries<Folder>().Should().BeEmpty();
    }

    [Test]
    public async Task GetByIdAsync_WhenFolderBelongsToAnotherUser_ShouldReturnNotFound()
    {
        var user = await SeedUserAsync();
        var otherUser = await SeedUserAsync();
        var folder = await SeedFolderAsync(otherUser.Id, "Private");

        var result = await sut.GetByIdAsync(folder.Id, user.Id);

        result.Status.Should().Be(ResultStatus.NotFound);
    }

    [Test]
    public async Task GetTreeAsync_ShouldReturnFoldersInParentBeforeChildrenOrder()
    {
        var user = await SeedUserAsync();
        var otherUser = await SeedUserAsync();
        var rootA = await SeedFolderAsync(user.Id, "B-root", sortOrder: 2);
        var rootB = await SeedFolderAsync(user.Id, "A-root", sortOrder: 1);
        var childA = await SeedFolderAsync(user.Id, "child-2", parentFolderId: rootB.Id, sortOrder: 2);
        var childB = await SeedFolderAsync(user.Id, "child-1", parentFolderId: rootB.Id, sortOrder: 1);
        await SeedFolderAsync(otherUser.Id, "foreign");

        var treeResult = await sut.GetTreeAsync(user.Id);

        treeResult.Status.Should().Be(ResultStatus.Ok);
        treeResult.Value.Select(folder => folder.Id).Should().BeEquivalentTo(
            [rootB.Id, childB.Id, childA.Id, rootA.Id],
            options => options.WithStrictOrdering());
    }

    [Test]
    public async Task GetRootFoldersAsync_ShouldReturnOnlyRootFoldersForUser()
    {
        var user = await SeedUserAsync();
        var otherUser = await SeedUserAsync();
        var rootA = await SeedFolderAsync(user.Id, "B-root", sortOrder: 2);
        var rootB = await SeedFolderAsync(user.Id, "A-root", sortOrder: 1);
        await SeedFolderAsync(user.Id, "child", parentFolderId: rootB.Id, sortOrder: 1);
        await SeedFolderAsync(otherUser.Id, "foreign");

        var result = await sut.GetRootFoldersAsync(user.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Select(folder => folder.Id).Should().BeEquivalentTo(
            [rootB.Id, rootA.Id],
            options => options.WithStrictOrdering());
    }

    [Test]
    public async Task GetChildrenAsync_ShouldReturnOnlyDirectChildrenForParent()
    {
        var user = await SeedUserAsync();
        var root = await SeedFolderAsync(user.Id, "root");
        var childA = await SeedFolderAsync(user.Id, "child-2", parentFolderId: root.Id, sortOrder: 2);
        var childB = await SeedFolderAsync(user.Id, "child-1", parentFolderId: root.Id, sortOrder: 1);
        await SeedFolderAsync(user.Id, "grand-child", parentFolderId: childA.Id);

        var result = await sut.GetChildrenAsync(root.Id, user.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Select(folder => folder.Id).Should().BeEquivalentTo(
            [childB.Id, childA.Id],
            options => options.WithStrictOrdering());
    }

    [Test]
    public async Task GetSiblingsAsync_ShouldReturnFoldersWithSameParent()
    {
        var user = await SeedUserAsync();
        var rootA = await SeedFolderAsync(user.Id, "B-root", sortOrder: 2);
        var rootB = await SeedFolderAsync(user.Id, "A-root", sortOrder: 1);

        var result = await sut.GetSiblingsAsync(null, user.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Select(folder => folder.Id).Should().BeEquivalentTo(
            [rootB.Id, rootA.Id],
            options => options.WithStrictOrdering());
    }

    [Test]
    public async Task GetAncestorIdsAsync_ShouldReturnParentChainFromClosestToFarthest()
    {
        var user = await SeedUserAsync();
        var root = await SeedFolderAsync(user.Id, "root");
        var middle = await SeedFolderAsync(user.Id, "middle", parentFolderId: root.Id);
        var leaf = await SeedFolderAsync(user.Id, "leaf", parentFolderId: middle.Id);

        var result = await sut.GetAncestorIdsAsync(leaf.Id, user.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeEquivalentTo([middle.Id, root.Id], options => options.WithStrictOrdering());
    }

    [Test]
    public async Task ExistsByNameInParentAsync_ShouldRespectExcludeId()
    {
        var user = await SeedUserAsync();
        var root = await SeedFolderAsync(user.Id, "root");
        var folder = await SeedFolderAsync(user.Id, "Invoices", parentFolderId: root.Id);

        var existsResult = await sut.ExistsByNameInParentAsync("Invoices", root.Id, user.Id);
        var excludedResult = await sut.ExistsByNameInParentAsync("Invoices", root.Id, user.Id, folder.Id);

        existsResult.Status.Should().Be(ResultStatus.Ok);
        excludedResult.Status.Should().Be(ResultStatus.Ok);
        existsResult.Value.Should().BeTrue();
        excludedResult.Value.Should().BeFalse();
    }

    [Test]
    public async Task AddUpdateDeleteAndCount_ShouldPersistExpectedChanges()
    {
        var user = await SeedUserAsync();
        var folderId = Guid.NewGuid();
        var created = new Folder(folderId, user.Id, "Drafts", "Initial description", sortOrder: 3);

        (await sut.AddAsync(created)).Status.Should().Be(ResultStatus.Ok);
        await Context.SaveChangesAsync();

        (await sut.CountByUserAsync(user.Id)).Value.Should().Be(1);

        var updated = new Folder(folderId, user.Id, "Drafts renamed", "Updated description", sortOrder: 1);
        (await sut.UpdateAsync(updated)).Status.Should().Be(ResultStatus.Ok);
        await Context.SaveChangesAsync();

        await using (var assertContext = CreateDbContext())
        {
            var persisted = await assertContext.Folders.SingleAsync(folder => folder.Id == folderId);
            persisted.Name.Should().Be("Drafts renamed");
            persisted.Description.Should().Be("Updated description");
            persisted.SortOrder.Should().Be(1);
        }

        (await sut.DeleteAsync(folderId, user.Id)).Status.Should().Be(ResultStatus.Ok);
        await Context.SaveChangesAsync();

        await using var verifyDeletedContext = CreateDbContext();
        (await verifyDeletedContext.Folders.AnyAsync(folder => folder.Id == folderId)).Should().BeFalse();
    }

    [Test]
    public async Task DeleteSubtreeAsync_ShouldDeleteFolderAndAllDescendants()
    {
        var user = await SeedUserAsync();
        var root = await SeedFolderAsync(user.Id, "root");
        var child = await SeedFolderAsync(user.Id, "child", parentFolderId: root.Id);
        var grandChild = await SeedFolderAsync(user.Id, "grand-child", parentFolderId: child.Id);

        var result = await sut.DeleteSubtreeAsync(root.Id, user.Id);
        await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.Ok);

        await using var assertContext = CreateDbContext();
        (await assertContext.Folders.CountAsync()).Should().Be(0);
    }

    [Test]
    public async Task DeleteAsync_WhenFolderDoesNotExist_ShouldBeNoOp()
    {
        var result = await sut.DeleteAsync(Guid.NewGuid(), Guid.NewGuid());
        await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.Ok);
    }

    [Test]
    public async Task DeleteSubtreeAsync_WhenFolderDoesNotExist_ShouldBeNoOp()
    {
        var user = await SeedUserAsync();
        await SeedFolderAsync(user.Id, "root");

        var result = await sut.DeleteSubtreeAsync(Guid.NewGuid(), user.Id);
        await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.Ok);

        await using var assertContext = CreateDbContext();
        (await assertContext.Folders.CountAsync()).Should().Be(1);
    }

    [Test]
    public async Task GetAncestorIdsAsync_WhenFolderBelongsToAnotherUser_ShouldReturnEmpty()
    {
        var user = await SeedUserAsync();
        var otherUser = await SeedUserAsync();
        var root = await SeedFolderAsync(otherUser.Id, "root");
        var leaf = await SeedFolderAsync(otherUser.Id, "leaf", parentFolderId: root.Id);

        var result = await sut.GetAncestorIdsAsync(leaf.Id, user.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeEmpty();
    }

    [Test]
    public async Task DeleteAsync_WhenFolderBelongsToAnotherUser_ShouldBeNoOp()
    {
        var user = await SeedUserAsync();
        var otherUser = await SeedUserAsync();
        var folder = await SeedFolderAsync(otherUser.Id, "private");

        var result = await sut.DeleteAsync(folder.Id, user.Id);
        await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.Ok);

        await using var assertContext = CreateDbContext();
        (await assertContext.Folders.AnyAsync(existingFolder => existingFolder.Id == folder.Id)).Should().BeTrue();
    }

    [Test]
    public async Task DeleteSubtreeAsync_WhenFolderBelongsToAnotherUser_ShouldBeNoOp()
    {
        var user = await SeedUserAsync();
        var otherUser = await SeedUserAsync();
        var root = await SeedFolderAsync(otherUser.Id, "private-root");
        var child = await SeedFolderAsync(otherUser.Id, "private-child", parentFolderId: root.Id);

        var result = await sut.DeleteSubtreeAsync(root.Id, user.Id);
        await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.Ok);

        await using var assertContext = CreateDbContext();
        (await assertContext.Folders.AnyAsync(folder => folder.Id == root.Id)).Should().BeTrue();
        (await assertContext.Folders.AnyAsync(folder => folder.Id == child.Id)).Should().BeTrue();
    }

    [Test]
    public async Task GetAncestorIdsAsync_WhenHierarchyContainsCycle_ShouldReturnError()
    {
        var user = await SeedUserAsync();
        var root = await SeedFolderAsync(user.Id, "root");
        var middle = await SeedFolderAsync(user.Id, "middle", parentFolderId: root.Id);
        var leaf = await SeedFolderAsync(user.Id, "leaf", parentFolderId: middle.Id);

        await using (var cycleContext = CreateDbContext())
        {
            await cycleContext.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE folders SET parent_folder_id = {leaf.Id} WHERE id = {root.Id}");
        }

        var result = await sut.GetAncestorIdsAsync(leaf.Id, user.Id);

        result.Status.Should().Be(ResultStatus.Error);
    }

    [Test]
    public async Task GetTreeAsync_WhenHierarchyContainsCycle_ShouldReturnError()
    {
        var user = await SeedUserAsync();
        var root = await SeedFolderAsync(user.Id, "root");
        var child = await SeedFolderAsync(user.Id, "child", parentFolderId: root.Id);

        await using (var cycleContext = CreateDbContext())
        {
            await cycleContext.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE folders SET parent_folder_id = {child.Id} WHERE id = {root.Id}");
        }

        var result = await sut.GetTreeAsync(user.Id);

        result.Status.Should().Be(ResultStatus.Error);
    }

    private async Task<User> SeedUserAsync(Guid? userId = null)
    {
        var user = new User(userId ?? Guid.NewGuid());

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
}
