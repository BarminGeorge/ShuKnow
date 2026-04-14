using Ardalis.Result;
using AwesomeAssertions;
using NSubstitute;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Services;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Application.Tests.Services;

public class WorkspacePathServiceTests
{
    private IFolderRepository folderRepository = null!;
    private ICurrentUserService currentUserService = null!;
    private Guid currentUserId;
    private WorkspacePathService sut = null!;

    [SetUp]
    public void SetUp()
    {
        folderRepository = Substitute.For<IFolderRepository>();
        currentUserService = Substitute.For<ICurrentUserService>();
        currentUserId = Guid.NewGuid();

        currentUserService.UserId.Returns(currentUserId);
        folderRepository.GetByNameInParentAsync(Arg.Any<string>(), Arg.Any<Guid?>(), currentUserId)
            .Returns((callInfo) =>
            {
                var name = callInfo.Arg<string>();
                var parentId = callInfo.Arg<Guid?>();
                return Task.FromResult(Result<Folder>.NotFound($"Folder '{name}' not found."));
            });

        sut = new WorkspacePathService(folderRepository, currentUserService);
    }

    [Test]
    public async Task ResolveFolderAsync_WhenNestedPathExists_ShouldReturnFolder()
    {
        var root = CreateFolder(name: "docs");
        var child = CreateFolder(name: "specs", parentFolderId: root.Id);

        folderRepository.GetByNameInParentAsync("docs", null, currentUserId).Returns(Success(root));
        folderRepository.GetByNameInParentAsync("specs", root.Id, currentUserId).Returns(Success(child));

        var result = await sut.ResolveFolderAsync("docs/specs");

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(child);
    }

    [Test]
    public async Task ResolveFolderAsync_WhenPathContainsRelativeSegment_ShouldReturnInvalid()
    {
        var result = await sut.ResolveFolderAsync("docs/../specs");

        result.Status.Should().Be(ResultStatus.Invalid);
        result.ValidationErrors.Should().ContainSingle().Which.ErrorMessage.Should().Contain("must not contain");
        await folderRepository.DidNotReceive().GetRootFoldersAsync(Arg.Any<Guid>());
    }

    [Test]
    public async Task ResolveFolderCreationPathAsync_WhenPathTargetsRootFolder_ShouldReturnRootTarget()
    {
        var result = await sut.ResolveFolderCreationPathAsync("notes");

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.FolderName.Should().Be("notes");
        result.Value.ParentFolderId.Should().BeNull();
        result.Value.FullPath.Should().Be("notes");
        await folderRepository.DidNotReceive().GetRootFoldersAsync(Arg.Any<Guid>());
    }

    [Test]
    public async Task ResolveFolderCreationPathAsync_WhenParentFolderIsMissing_ShouldReturnNotFound()
    {
        folderRepository.GetByNameInParentAsync("docs", null, currentUserId)
            .Returns(Task.FromResult(Result<Folder>.NotFound("Folder 'docs' not found.")));

        var result = await sut.ResolveFolderCreationPathAsync("docs/specs");

        result.Status.Should().Be(ResultStatus.NotFound);
        result.Errors.Should().ContainSingle().Which.Should().Contain("docs");
    }

    [Test]
    public async Task ResolveFilePathAsync_WhenParentFolderExists_ShouldReturnFolderIdAndFileName()
    {
        var root = CreateFolder(name: "docs");
        var child = CreateFolder(name: "specs", parentFolderId: root.Id);

        folderRepository.GetByNameInParentAsync("docs", null, currentUserId).Returns(Success(root));
        folderRepository.GetByNameInParentAsync("specs", root.Id, currentUserId).Returns(Success(child));

        var result = await sut.ResolveFilePathAsync("docs/specs/design.md");

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.FileName.Should().Be("design.md");
        result.Value.FolderId.Should().Be(child.Id);
        result.Value.FullPath.Should().Be("docs/specs/design.md");
    }

    [Test]
    public async Task ResolveFilePathAsync_WhenParentFolderIsMissing_ShouldReturnNotFound()
    {
        folderRepository.GetByNameInParentAsync("docs", null, currentUserId)
            .Returns(Task.FromResult(Result<Folder>.NotFound("Folder 'docs' not found.")));

        var result = await sut.ResolveFilePathAsync("docs/specs/design.md");

        result.Status.Should().Be(ResultStatus.NotFound);
        result.Errors.Should().ContainSingle().Which.Should().Contain("docs");
    }

    private Folder CreateFolder(
        Guid? folderId = null,
        string name = "Folder",
        Guid? parentFolderId = null)
    {
        return new Folder(
            folderId ?? Guid.NewGuid(),
            currentUserId,
            name,
            "description",
            parentFolderId);
    }

    private static Task<Result<T>> Success<T>(T value)
    {
        return Task.FromResult(Result.Success(value));
    }
}
