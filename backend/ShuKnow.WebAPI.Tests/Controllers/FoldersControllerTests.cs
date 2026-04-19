using Ardalis.Result;
using AwesomeAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using NSubstitute;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.Metrics.Services;
using ShuKnow.WebAPI.Controllers;
using ShuKnow.WebAPI.Dto.Files;
using ShuKnow.WebAPI.Dto.Folders;
using ShuKnow.WebAPI.Requests.Folders;
using DomainFile = ShuKnow.Domain.Entities.File;

namespace ShuKnow.WebAPI.Tests.Controllers;

public class FoldersControllerTests
{
    private IFolderService folderService = null!;
    private IFileService fileService = null!;
    private ICurrentUserService currentUser = null!;
    private IMetricsService metricsService = null!;
    private Guid currentUserId;
    private FoldersController sut = null!;

    [SetUp]
    public void SetUp()
    {
        folderService = Substitute.For<IFolderService>();
        fileService = Substitute.For<IFileService>();
        currentUser = Substitute.For<ICurrentUserService>();
        metricsService = Substitute.For<IMetricsService>();
        currentUserId = Guid.NewGuid();
        currentUser.UserId.Returns(currentUserId);
        metricsService.RecordContentSavedAsync(Arg.Any<Guid>(), Arg.Any<Guid>()).Returns(Task.CompletedTask);
        sut = new FoldersController(folderService, fileService, currentUser, metricsService)
        {
            ControllerContext = CreateControllerContext()
        };
    }

    [Test]
    public async Task GetFolderTree_WhenServiceSucceeds_ShouldReturnTree()
    {
        var root = CreateFolder(name: "Root", emoji: "R");
        var child = CreateFolder(name: "Child", parentFolderId: root.Id);
        folderService.GetTreeAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<IReadOnlyList<Folder>>([root, child])));

        var response = await sut.GetFolderTree(CancellationToken.None);

        var tree = GetOkValue<IReadOnlyList<FolderTreeNodeDto>>(response);
        tree.Should().ContainSingle();
        tree[0].Name.Should().Be("Root");
        tree[0].Children.Should().ContainSingle();
        tree[0].Children[0].Name.Should().Be("Child");
    }

    [Test]
    public async Task GetFolders_WhenServiceSucceeds_ShouldReturnFolderDtos()
    {
        var parentId = Guid.NewGuid();
        var folder = CreateFolder(name: "Invoices", parentFolderId: parentId);
        folderService.ListAsync(parentId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<IReadOnlyList<Folder>>([folder])));

        var response = await sut.GetFolders(parentId, CancellationToken.None);

        var dtos = GetOkValue<IReadOnlyList<FolderDto>>(response);
        dtos.Should().ContainSingle();
        dtos[0].Id.Should().Be(folder.Id);
        dtos[0].ParentFolderId.Should().Be(parentId);
    }

    [Test]
    public async Task CreateFolder_WhenServiceSucceeds_ShouldCreateFolderForCurrentUser()
    {
        var parentId = Guid.NewGuid();
        Folder? capturedFolder = null;
        folderService.CreateAsync(
                Arg.Do<Folder>(folder => capturedFolder = folder),
                Arg.Any<CancellationToken>())
            .Returns(call => Task.FromResult(Result.Created(call.Arg<Folder>())));

        var response = await sut.CreateFolder(
            new CreateFolderRequest("Invoices", Emoji: "I", ParentFolderId: parentId),
            CancellationToken.None);

        var dto = GetCreatedValue<FolderDto>(response);
        dto.Name.Should().Be("Invoices");
        dto.Description.Should().BeEmpty();
        dto.Emoji.Should().Be("I");
        dto.ParentFolderId.Should().Be(parentId);
        capturedFolder.Should().NotBeNull();
        capturedFolder!.UserId.Should().Be(currentUserId);
        capturedFolder.Name.Should().Be("Invoices");
        capturedFolder.Description.Should().BeEmpty();
        capturedFolder.ParentFolderId.Should().Be(parentId);
    }

    [Test]
    public async Task GetFolder_WhenFolderExists_ShouldReturnFolderDto()
    {
        var folder = CreateFolder(name: "Docs");
        folderService.GetByIdAsync(folder.Id, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success(folder)));

        var response = await sut.GetFolder(folder.Id, CancellationToken.None);

        var dto = GetOkValue<FolderDto>(response);
        dto.Id.Should().Be(folder.Id);
        dto.Name.Should().Be("Docs");
    }

    [Test]
    public async Task UpdateFolder_WhenFolderExists_ShouldPatchProvidedFieldsAndSave()
    {
        var parentId = Guid.NewGuid();
        var folder = CreateFolder(
            name: "Old",
            description: "old description",
            parentFolderId: parentId,
            emoji: "O",
            sortOrder: 7);
        Folder? capturedFolder = null;
        folderService.GetByIdAsync(folder.Id, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success(folder)));
        folderService.UpdateAsync(
                Arg.Do<Folder>(updated => capturedFolder = updated),
                Arg.Any<CancellationToken>())
            .Returns(call => Task.FromResult(Result.Success(call.Arg<Folder>())));

        var response = await sut.UpdateFolder(
            folder.Id,
            new UpdateFolderRequest(Name: "New", Emoji: "N"),
            CancellationToken.None);

        var dto = GetOkValue<FolderDto>(response);
        dto.Name.Should().Be("New");
        dto.Description.Should().Be("old description");
        dto.Emoji.Should().Be("N");
        capturedFolder.Should().NotBeNull();
        capturedFolder!.Id.Should().Be(folder.Id);
        capturedFolder.UserId.Should().Be(folder.UserId);
        capturedFolder.ParentFolderId.Should().Be(parentId);
        capturedFolder.SortOrder.Should().Be(7);
    }

    [Test]
    public async Task UpdateFolder_WhenFolderDoesNotExist_ShouldReturnNotFoundAndSkipSave()
    {
        var folderId = Guid.NewGuid();
        folderService.GetByIdAsync(folderId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<Folder>.NotFound()));

        var response = await sut.UpdateFolder(
            folderId,
            new UpdateFolderRequest(Name: "New"),
            CancellationToken.None);

        GetStatusCode(response.Result).Should().Be(StatusCodes.Status404NotFound);
        await folderService.DidNotReceive()
            .UpdateAsync(Arg.Any<Folder>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task DeleteFolder_WhenServiceSucceeds_ShouldReturnOk()
    {
        var folderId = Guid.NewGuid();
        folderService.DeleteAsync(folderId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success()));

        var response = await sut.DeleteFolder(folderId, CancellationToken.None);

        GetStatusCode(response).Should().Be(StatusCodes.Status200OK);
        await folderService.Received(1).DeleteAsync(folderId, Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task MoveFolder_WhenServiceSucceeds_ShouldReturnMovedFolderDto()
    {
        var newParentId = Guid.NewGuid();
        var folder = CreateFolder(parentFolderId: newParentId);
        folderService.MoveAsync(folder.Id, newParentId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success(folder)));

        var response = await sut.MoveFolder(
            folder.Id,
            new MoveFolderRequest(newParentId),
            CancellationToken.None);

        var dto = GetOkValue<FolderDto>(response);
        dto.ParentFolderId.Should().Be(newParentId);
        await folderService.Received(1)
            .MoveAsync(folder.Id, newParentId, Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ReorderFolder_WhenServiceSucceeds_ShouldReturnOk()
    {
        var folderId = Guid.NewGuid();
        folderService.ReorderAsync(folderId, 4, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success()));

        var response = await sut.ReorderFolder(
            folderId,
            new ReorderFolderRequest(4),
            CancellationToken.None);

        GetStatusCode(response).Should().Be(StatusCodes.Status200OK);
        await folderService.Received(1)
            .ReorderAsync(folderId, 4, Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task GetFolderChildren_WhenServiceSucceeds_ShouldReturnChildDtos()
    {
        var folderId = Guid.NewGuid();
        var child = CreateFolder(name: "Child", parentFolderId: folderId);
        folderService.GetChildrenAsync(folderId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<IReadOnlyList<Folder>>([child])));

        var response = await sut.GetFolderChildren(folderId, CancellationToken.None);

        var dtos = GetOkValue<IReadOnlyList<FolderDto>>(response);
        dtos.Should().ContainSingle();
        dtos[0].Name.Should().Be("Child");
    }

    [Test]
    public async Task GetFolderFiles_WhenServiceSucceeds_ShouldReturnPagedFiles()
    {
        var folderId = Guid.NewGuid();
        var file = CreateFile(folderId: folderId, name: "report.pdf");
        fileService.ListByFolderAsync(folderId, 2, 2, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success((Files: (IReadOnlyList<DomainFile>)[file], TotalCount: 5))));

        var response = await sut.GetFolderFiles(folderId, page: 2, pageSize: 2, CancellationToken.None);

        var result = GetOkValue<PagedFileResult>(response);
        result.Items.Should().ContainSingle();
        result.Items[0].Name.Should().Be("report.pdf");
        result.TotalCount.Should().Be(5);
        result.Page.Should().Be(2);
        result.PageSize.Should().Be(2);
        result.HasNextPage.Should().BeTrue();
    }

    [Test]
    public async Task UploadFile_WhenServiceSucceeds_ShouldCreateFileForCurrentUser()
    {
        var folderId = Guid.NewGuid();
        var formFile = CreateFormFile("source.txt", "text/plain", [1, 2, 3, 4]);
        DomainFile? capturedFile = null;
        fileService.UploadAsync(
                Arg.Do<DomainFile>(file => capturedFile = file),
                Arg.Any<Stream>(),
                Arg.Any<CancellationToken>())
            .Returns(call => Task.FromResult(Result.Created(call.Arg<DomainFile>())));

        var response = await sut.UploadFile(
            folderId,
            formFile,
            name: "display.txt",
            description: "description",
            CancellationToken.None);

        var dto = GetCreatedValue<FileDto>(response);
        dto.Name.Should().Be("display.txt");
        dto.Description.Should().Be("description");
        dto.FolderId.Should().Be(folderId);
        capturedFile.Should().NotBeNull();
        capturedFile!.UserId.Should().Be(currentUserId);
        capturedFile.FolderId.Should().Be(folderId);
        capturedFile.Name.Should().Be("display.txt");
        capturedFile.Description.Should().Be("description");
        capturedFile.ContentType.Should().Be("text/plain");
        capturedFile.SizeBytes.Should().Be(4);
    }

    private static Folder CreateFolder(
        Guid? id = null,
        Guid? userId = null,
        Guid? parentFolderId = null,
        string name = "Folder",
        string description = "description",
        string? emoji = null,
        int sortOrder = 0)
    {
        return new Folder(
            id ?? Guid.NewGuid(),
            userId ?? Guid.NewGuid(),
            name,
            description,
            parentFolderId,
            sortOrder,
            emoji);
    }

    private static DomainFile CreateFile(
        Guid? id = null,
        Guid? folderId = null,
        string name = "file.txt")
    {
        return new DomainFile(
            id ?? Guid.NewGuid(),
            Guid.NewGuid(),
            folderId,
            name,
            "description",
            "text/plain",
            10);
    }

    private static FormFile CreateFormFile(string fileName, string contentType, byte[] content)
    {
        var stream = new MemoryStream(content);
        return new FormFile(stream, 0, content.Length, "file", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }

    private static T GetOkValue<T>(ActionResult<T> response)
    {
        var objectResult = response.Result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status200OK);
        return objectResult.Value.Should().BeAssignableTo<T>().Subject;
    }

    private static T GetCreatedValue<T>(ActionResult<T> response)
    {
        var createdResult = response.Result.Should().BeOfType<CreatedResult>().Subject;
        createdResult.StatusCode.Should().Be(StatusCodes.Status201Created);
        return createdResult.Value.Should().BeAssignableTo<T>().Subject;
    }

    private static int? GetStatusCode(IActionResult? result)
    {
        return result switch
        {
            ObjectResult objectResult => objectResult.StatusCode,
            StatusCodeResult statusCodeResult => statusCodeResult.StatusCode,
            _ => null
        };
    }

    private static ControllerContext CreateControllerContext()
    {
        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext(),
            ActionDescriptor = new ControllerActionDescriptor()
        };
    }
}
