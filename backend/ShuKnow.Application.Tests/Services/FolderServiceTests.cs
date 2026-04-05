using System.Reflection;
using Ardalis.Result;
using AwesomeAssertions;
using NSubstitute;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Application.Tests.Services;

public class FolderServiceTests
{
    private IFolderRepository folderRepository = null!;
    private IFileRepository fileRepository = null!;
    private ICurrentUserService currentUserService = null!;
    private IUnitOfWork unitOfWork = null!;
    private Guid currentUserId;
    private IFolderService sut = null!;

    [SetUp]
    public void SetUp()
    {
        folderRepository = Substitute.For<IFolderRepository>();
        fileRepository = Substitute.For<IFileRepository>();
        currentUserService = Substitute.For<ICurrentUserService>();
        unitOfWork = Substitute.For<IUnitOfWork>();
        currentUserId = Guid.NewGuid();

        currentUserService.UserId.Returns(currentUserId);

        ConfigureDefaults();

        sut = CreateSut();
    }



    [Test]
    public async Task GetTreeAsync_WhenUserIsAuthenticated_ShouldReturnRepositoryResultForCurrentUser()
    {
        IReadOnlyList<Folder> folders = [CreateFolder(name: "Root"), CreateFolder(name: "Child")];
        folderRepository.GetTreeAsync(currentUserId).Returns(Success(folders));

        var result = await sut.GetTreeAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeEquivalentTo(folders);
        await folderRepository.Received(1).GetTreeAsync(currentUserId);
    }

    [Test]
    public async Task GetFolderTreeForPromptAsync_WhenCalled_ShouldMapFoldersToSummaries()
    {
        IReadOnlyList<Folder> folders =
        [
            CreateFolder(name: "Root"),
            CreateFolder(name: "Child", parentFolderId: Guid.NewGuid(), description: "nested")
        ];
        folderRepository.GetTreeAsync(currentUserId).Returns(Success(folders));

        var result = await sut.GetFolderTreeForPromptAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeEquivalentTo(folders.Select(folder =>
            new FolderSummary(folder.Id, folder.Name, folder.Description, folder.ParentFolderId)));
    }

    [Test]
    public async Task ListAsync_WhenParentIsNull_ShouldReturnRootFolders()
    {
        IReadOnlyList<Folder> rootFolders = [CreateFolder(name: "Root")];
        folderRepository.GetRootFoldersAsync(currentUserId).Returns(Success(rootFolders));

        var result = await sut.ListAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeEquivalentTo(rootFolders);
        await folderRepository.Received(1).GetRootFoldersAsync(currentUserId);
    }

    [Test]
    public async Task ListAsync_WhenParentDoesNotExist_ShouldReturnNotFound()
    {
        var parentId = Guid.NewGuid();
        folderRepository.ExistsByIdAsync(parentId, currentUserId).Returns(Success(false));

        var result = await sut.ListAsync(parentId);

        result.Status.Should().Be(ResultStatus.NotFound);
        await folderRepository.DidNotReceive().GetChildrenAsync(parentId, currentUserId);
    }

    [Test]
    public async Task GetByIdAsync_WhenCalled_ShouldReturnRepositoryResultForCurrentUser()
    {
        var folder = CreateFolder();
        folderRepository.GetByIdAsync(folder.Id, currentUserId).Returns(Success(folder));

        var result = await sut.GetByIdAsync(folder.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(folder);
        await folderRepository.Received(1).GetByIdAsync(folder.Id, currentUserId);
    }

    [Test]
    public async Task GetChildrenAsync_WhenFolderDoesNotExist_ShouldReturnNotFound()
    {
        var folderId = Guid.NewGuid();
        folderRepository.ExistsByIdAsync(folderId, currentUserId).Returns(Success(false));

        var result = await sut.GetChildrenAsync(folderId);

        result.Status.Should().Be(ResultStatus.NotFound);
        await folderRepository.DidNotReceive().GetChildrenAsync(folderId, currentUserId);
    }

    [Test]
    public async Task CreateAsync_WhenParentDoesNotExist_ShouldReturnNotFound()
    {
        var parentId = Guid.NewGuid();
        var folder = CreateFolder(parentFolderId: parentId);
        folderRepository.ExistsByIdAsync(parentId, currentUserId).Returns(Success(false));

        var result = await sut.CreateAsync(folder);

        result.Status.Should().Be(ResultStatus.NotFound);
        await folderRepository.DidNotReceive().AddAsync(Arg.Any<Folder>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task CreateAsync_WhenFolderNameAlreadyExistsInParent_ShouldReturnConflict()
    {
        var parentId = Guid.NewGuid();
        var folder = CreateFolder(parentFolderId: parentId, name: "Invoices");

        folderRepository.ExistsByIdAsync(parentId, currentUserId).Returns(Success(true));
        folderRepository.ExistsByNameInParentAsync(folder.Name, parentId, currentUserId, null).Returns(Success(true));

        var result = await sut.CreateAsync(folder);

        result.Status.Should().Be(ResultStatus.Conflict);
        await folderRepository.DidNotReceive().AddAsync(Arg.Any<Folder>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task CreateAsync_WhenRequestIsValid_ShouldCreateFolderForCurrentUserAtEndOfSiblings()
    {
        var parentId = Guid.NewGuid();
        var folder = CreateFolder(folderId: Guid.NewGuid(), parentFolderId: parentId, name: "Invoices", sortOrder: 99);
        IReadOnlyList<Folder> siblings = [CreateFolder(parentFolderId: parentId, name: "A", sortOrder: 0)];

        folderRepository.ExistsByIdAsync(parentId, currentUserId).Returns(Success(true));
        folderRepository.ExistsByNameInParentAsync(folder.Name, parentId, currentUserId, null).Returns(Success(false));
        folderRepository.GetSiblingsAsync(parentId, currentUserId).Returns(Success(siblings));

        var result = await sut.CreateAsync(folder);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Id.Should().Be(folder.Id);
        result.Value.UserId.Should().Be(currentUserId);
        result.Value.ParentFolderId.Should().Be(parentId);
        result.Value.Name.Should().Be(folder.Name);
        result.Value.Description.Should().Be(folder.Description);
        result.Value.SortOrder.Should().Be(siblings.Count);
        await folderRepository.Received(1).AddAsync(Arg.Is<Folder>(added =>
            added.Id == folder.Id &&
            added.UserId == currentUserId &&
            added.ParentFolderId == parentId &&
            added.SortOrder == siblings.Count));
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task UpdateAsync_WhenFolderNameAlreadyExistsInParent_ShouldReturnConflict()
    {
        var existingFolder = CreateFolder(name: "Old");
        var updatedFolder = CreateFolder(folderId: existingFolder.Id, name: "New");

        folderRepository.GetByIdAsync(existingFolder.Id, currentUserId).Returns(Success(existingFolder));
        folderRepository.ExistsByNameInParentAsync(updatedFolder.Name, existingFolder.ParentFolderId, currentUserId, existingFolder.Id)
            .Returns(Success(true));

        var result = await sut.UpdateAsync(updatedFolder);

        result.Status.Should().Be(ResultStatus.Conflict);
        await folderRepository.DidNotReceive().UpdateAsync(Arg.Any<Folder>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task UpdateAsync_WhenRequestIsValid_ShouldPersistUpdatedNameAndDescription()
    {
        var existingFolder = CreateFolder(name: "Old", description: "Old description", sortOrder: 4);
        var updatedFolder = CreateFolder(
            folderId: existingFolder.Id,
            parentFolderId: Guid.NewGuid(),
            name: "New",
            description: "New description",
            sortOrder: 0);

        folderRepository.GetByIdAsync(existingFolder.Id, currentUserId).Returns(Success(existingFolder));
        folderRepository.ExistsByNameInParentAsync(updatedFolder.Name, existingFolder.ParentFolderId, currentUserId, existingFolder.Id)
            .Returns(Success(false));

        var result = await sut.UpdateAsync(updatedFolder);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Id.Should().Be(existingFolder.Id);
        result.Value.ParentFolderId.Should().Be(existingFolder.ParentFolderId);
        result.Value.SortOrder.Should().Be(existingFolder.SortOrder);
        result.Value.Name.Should().Be(updatedFolder.Name);
        result.Value.Description.Should().Be(updatedFolder.Description);
        await folderRepository.Received(1).UpdateAsync(Arg.Is<Folder>(saved =>
            saved.Id == existingFolder.Id &&
            saved.ParentFolderId == existingFolder.ParentFolderId &&
            saved.SortOrder == existingFolder.SortOrder &&
            saved.Name == updatedFolder.Name &&
            saved.Description == updatedFolder.Description));
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task DeleteAsync_WhenNonRecursiveAndFolderHasChildren_ShouldReturnConflict()
    {
        var folder = CreateFolder();
        IReadOnlyList<Folder> children = [CreateFolder(parentFolderId: folder.Id)];

        folderRepository.GetByIdAsync(folder.Id, currentUserId).Returns(Success(folder));
        folderRepository.GetChildrenAsync(folder.Id, currentUserId).Returns(Success(children));

        var result = await sut.DeleteAsync(folder.Id, recursive: false);

        result.Status.Should().Be(ResultStatus.Conflict);
        await fileRepository.DidNotReceive().CountByFolderAsync(Arg.Any<Guid>());
        await folderRepository.DidNotReceive().DeleteAsync(Arg.Any<Guid>(), Arg.Any<Guid>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task DeleteAsync_WhenNonRecursiveAndFolderHasFiles_ShouldReturnConflict()
    {
        var folder = CreateFolder();

        folderRepository.GetByIdAsync(folder.Id, currentUserId).Returns(Success(folder));
        folderRepository.GetChildrenAsync(folder.Id, currentUserId).Returns(Success<IReadOnlyList<Folder>>([]));
        fileRepository.CountByFolderAsync(folder.Id).Returns(Success(2));

        var result = await sut.DeleteAsync(folder.Id, recursive: false);

        result.Status.Should().Be(ResultStatus.Conflict);
        await folderRepository.DidNotReceive().DeleteAsync(Arg.Any<Guid>(), Arg.Any<Guid>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task DeleteAsync_WhenRecursive_ShouldDeleteSubtreeAndSaveChanges()
    {
        var folder = CreateFolder();
        folderRepository.GetByIdAsync(folder.Id, currentUserId).Returns(Success(folder));

        var result = await sut.DeleteAsync(folder.Id, recursive: true);

        result.Status.Should().Be(ResultStatus.Ok);
        await folderRepository.Received(1).DeleteSubtreeAsync(folder.Id, currentUserId);
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task MoveAsync_WhenTargetIsCurrentParent_ShouldReturnExistingFolderWithoutSavingChanges()
    {
        var parentId = Guid.NewGuid();
        var folder = CreateFolder(parentFolderId: parentId, sortOrder: 3);
        folderRepository.GetByIdAsync(folder.Id, currentUserId).Returns(Success(folder));

        var result = await sut.MoveAsync(folder.Id, parentId);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(folder);
        await folderRepository.DidNotReceive().UpdateAsync(Arg.Any<Folder>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task MoveAsync_WhenTargetIsFolderItself_ShouldReturnConflict()
    {
        var folder = CreateFolder();
        folderRepository.GetByIdAsync(folder.Id, currentUserId).Returns(Success(folder));

        var result = await sut.MoveAsync(folder.Id, folder.Id);

        result.Status.Should().Be(ResultStatus.Conflict);
        await folderRepository.DidNotReceive().UpdateAsync(Arg.Any<Folder>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task MoveAsync_WhenTargetParentIsDescendant_ShouldReturnConflict()
    {
        var folder = CreateFolder();
        var descendantId = Guid.NewGuid();

        folderRepository.GetByIdAsync(folder.Id, currentUserId).Returns(Success(folder));
        folderRepository.ExistsByIdAsync(descendantId, currentUserId).Returns(Success(true));
        folderRepository.ExistsByNameInParentAsync(folder.Name, descendantId, currentUserId, folder.Id).Returns(Success(false));
        folderRepository.GetAncestorIdsAsync(descendantId, currentUserId).Returns(Success<IReadOnlyList<Guid>>([folder.Id]));

        var result = await sut.MoveAsync(folder.Id, descendantId);

        result.Status.Should().Be(ResultStatus.Conflict);
        await folderRepository.DidNotReceive().UpdateAsync(Arg.Any<Folder>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task MoveAsync_WhenRequestIsValid_ShouldMoveFolderToTargetParentAndAppendSortOrder()
    {
        var folder = CreateFolder(parentFolderId: Guid.NewGuid(), name: "Docs", sortOrder: 4);
        var targetParentId = Guid.NewGuid();
        IReadOnlyList<Folder> targetSiblings =
        [
            CreateFolder(parentFolderId: targetParentId, name: "A", sortOrder: 0),
            CreateFolder(parentFolderId: targetParentId, name: "B", sortOrder: 1)
        ];

        folderRepository.GetByIdAsync(folder.Id, currentUserId).Returns(Success(folder));
        folderRepository.ExistsByIdAsync(targetParentId, currentUserId).Returns(Success(true));
        folderRepository.ExistsByNameInParentAsync(folder.Name, targetParentId, currentUserId, folder.Id).Returns(Success(false));
        folderRepository.GetAncestorIdsAsync(targetParentId, currentUserId).Returns(Success<IReadOnlyList<Guid>>([]));
        folderRepository.GetSiblingsAsync(targetParentId, currentUserId).Returns(Success(targetSiblings));

        var result = await sut.MoveAsync(folder.Id, targetParentId);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Id.Should().Be(folder.Id);
        result.Value.ParentFolderId.Should().Be(targetParentId);
        result.Value.SortOrder.Should().Be(targetSiblings.Count);
        await folderRepository.Received(1).UpdateAsync(Arg.Is<Folder>(saved =>
            saved.Id == folder.Id &&
            saved.ParentFolderId == targetParentId &&
            saved.SortOrder == targetSiblings.Count));
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task ReorderAsync_WhenPositionIsNegative_ShouldReturnError()
    {
        var result = await sut.ReorderAsync(Guid.NewGuid(), -1);

        result.Status.Should().Be(ResultStatus.Error);
        await folderRepository.DidNotReceive().GetByIdAsync(Arg.Any<Guid>(), Arg.Any<Guid>());
    }

    [Test]
    public async Task ReorderAsync_WhenRequestIsValid_ShouldUpdateSiblingSortOrders()
    {
        var parentId = Guid.NewGuid();
        var firstFolder = CreateFolder(parentFolderId: parentId, name: "A", sortOrder: 0);
        var secondFolder = CreateFolder(parentFolderId: parentId, name: "B", sortOrder: 1);
        var thirdFolder = CreateFolder(parentFolderId: parentId, name: "C", sortOrder: 2);
        IReadOnlyList<Folder> siblings = [firstFolder, secondFolder, thirdFolder];

        folderRepository.GetByIdAsync(secondFolder.Id, currentUserId).Returns(Success(secondFolder));
        folderRepository.GetSiblingsAsync(parentId, currentUserId).Returns(Success(siblings));

        var result = await sut.ReorderAsync(secondFolder.Id, 0);

        result.Status.Should().Be(ResultStatus.Ok);
        await folderRepository.Received(1).UpdateAsync(Arg.Is<Folder>(folder => folder.Id == secondFolder.Id && folder.SortOrder == 0));
        await folderRepository.Received(1).UpdateAsync(Arg.Is<Folder>(folder => folder.Id == firstFolder.Id && folder.SortOrder == 1));
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task EnsureInboxExistsAsync_WhenInboxAlreadyExists_ShouldReturnExistingFolder()
    {
        var inbox = CreateFolder(name: "Inbox");
        folderRepository.GetRootFoldersAsync(currentUserId).Returns(Success<IReadOnlyList<Folder>>([inbox]));

        var result = await sut.EnsureInboxExistsAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(inbox);
        await folderRepository.DidNotReceive().AddAsync(Arg.Any<Folder>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task EnsureInboxExistsAsync_WhenInboxDoesNotExist_ShouldCreateItAtRootEnd()
    {
        IReadOnlyList<Folder> rootFolders =
        [
            CreateFolder(name: "A", sortOrder: 0),
            CreateFolder(name: "B", sortOrder: 1)
        ];
        folderRepository.GetRootFoldersAsync(currentUserId).Returns(Success(rootFolders));

        var result = await sut.EnsureInboxExistsAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.UserId.Should().Be(currentUserId);
        result.Value.Name.Should().Be("Inbox");
        result.Value.ParentFolderId.Should().BeNull();
        result.Value.SortOrder.Should().Be(rootFolders.Count);
        await folderRepository.Received(1).AddAsync(Arg.Is<Folder>(folder =>
            folder.UserId == currentUserId &&
            folder.Name == "Inbox" &&
            folder.ParentFolderId == null &&
            folder.SortOrder == rootFolders.Count));
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    private void ConfigureDefaults()
    {
        unitOfWork.SaveChangesAsync().Returns(Success());
        folderRepository.GetTreeAsync(Arg.Any<Guid>()).Returns(Success<IReadOnlyList<Folder>>([]));
        folderRepository.GetRootFoldersAsync(Arg.Any<Guid>()).Returns(Success<IReadOnlyList<Folder>>([]));
        folderRepository.GetChildrenAsync(Arg.Any<Guid>(), Arg.Any<Guid>()).Returns(Success<IReadOnlyList<Folder>>([]));
        folderRepository.GetSiblingsAsync(Arg.Any<Guid?>(), Arg.Any<Guid>()).Returns(Success<IReadOnlyList<Folder>>([]));
        folderRepository.GetAncestorIdsAsync(Arg.Any<Guid>(), Arg.Any<Guid>()).Returns(Success<IReadOnlyList<Guid>>([]));
        folderRepository.ExistsByIdAsync(Arg.Any<Guid>(), Arg.Any<Guid>()).Returns(Success(true));
        folderRepository.ExistsByNameInParentAsync(Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<Guid>(), Arg.Any<Guid?>())
            .Returns(Success(false));
        folderRepository.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<Guid>()).Returns(NotFound<Folder>());
        folderRepository.AddAsync(Arg.Any<Folder>()).Returns(Success());
        folderRepository.UpdateAsync(Arg.Any<Folder>()).Returns(Success());
        folderRepository.DeleteAsync(Arg.Any<Guid>(), Arg.Any<Guid>()).Returns(Success());
        folderRepository.DeleteSubtreeAsync(Arg.Any<Guid>(), Arg.Any<Guid>()).Returns(Success());
        fileRepository.CountByFolderAsync(Arg.Any<Guid>()).Returns(Success(0));
    }

    private IFolderService CreateSut()
    {
        var folderServiceType = typeof(IFolderService).Assembly.GetType(
            "ShuKnow.Application.Services.FolderService",
            throwOnError: true)!;

        var constructor = folderServiceType.GetConstructors(BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)
            .Single();

        return (IFolderService)constructor.Invoke([folderRepository, fileRepository, currentUserService, unitOfWork]);
    }

    private Folder CreateFolder(
        Guid? folderId = null,
        Guid? parentFolderId = null,
        string name = "Folder",
        string description = "description",
        int sortOrder = 0)
    {
        return new Folder(
            folderId ?? Guid.NewGuid(),
            currentUserId,
            name,
            description,
            parentFolderId,
            sortOrder);
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
