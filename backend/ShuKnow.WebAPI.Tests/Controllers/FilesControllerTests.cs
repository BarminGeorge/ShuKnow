using Ardalis.Result;
using AwesomeAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using NSubstitute;
using ShuKnow.Application.Interfaces;
using ShuKnow.Metrics.Services;
using ShuKnow.WebAPI.Controllers;
using ShuKnow.WebAPI.Dto.Files;
using ShuKnow.WebAPI.Requests.Files;
using DomainFile = ShuKnow.Domain.Entities.File;

namespace ShuKnow.WebAPI.Tests.Controllers;

public class FilesControllerTests
{
    private IFileService fileService = null!;
    private IMetricsService metricsService = null!;
    private ICurrentUserService currentUserService = null!;
    private FilesController sut = null!;

    [SetUp]
    public void SetUp()
    {
        fileService = Substitute.For<IFileService>();
        metricsService = Substitute.For<IMetricsService>();
        currentUserService = Substitute.For<ICurrentUserService>();
        currentUserService.UserId.Returns(Guid.NewGuid());
        metricsService.RecordContentSavedAsync(Arg.Any<Guid>(), Arg.Any<Guid>()).Returns(Task.CompletedTask);
        metricsService.RecordManualMoveAsync(Arg.Any<Guid>()).Returns(Task.CompletedTask);
        metricsService.RecordContentOpenedAsync(Arg.Any<Guid>()).Returns(Task.CompletedTask);
        sut = new FilesController(fileService, metricsService, currentUserService)
        {
            ControllerContext = CreateControllerContext()
        };
    }

    [Test]
    public async Task GetFile_WhenFileExists_ShouldReturnFileDto()
    {
        var file = CreateFile(name: "notes.txt");
        fileService.GetByIdAsync(file.Id, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success(file)));

        var response = await sut.GetFile(file.Id, CancellationToken.None);

        var dto = GetOkValue<FileDto>(response);
        dto.Id.Should().Be(file.Id);
        dto.Name.Should().Be("notes.txt");
        dto.ContentType.Should().Be(file.ContentType);
    }

    [Test]
    public async Task UpdateFileMetadata_WhenFileExists_ShouldPatchMetadataAndSave()
    {
        var file = CreateFile(name: "old.txt", description: "old description");
        DomainFile? capturedFile = null;
        fileService.GetByIdAsync(file.Id, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success(file)));
        fileService.UpdateMetadataAsync(
                Arg.Do<DomainFile>(updated => capturedFile = updated),
                Arg.Any<CancellationToken>())
            .Returns(call => Task.FromResult(Result.Success(call.Arg<DomainFile>())));

        var response = await sut.UpdateFileMetadata(
            file.Id,
            new UpdateFileMetadataRequest(Name: "new.txt"),
            CancellationToken.None);

        var dto = GetOkValue<FileDto>(response);
        dto.Name.Should().Be("new.txt");
        dto.Description.Should().Be("old description");
        capturedFile.Should().NotBeNull();
        capturedFile!.Id.Should().Be(file.Id);
        capturedFile.Name.Should().Be("new.txt");
        capturedFile.Description.Should().Be("old description");
    }

    [Test]
    public async Task UpdateFileMetadata_WhenFileDoesNotExist_ShouldReturnNotFoundAndSkipSave()
    {
        var fileId = Guid.NewGuid();
        fileService.GetByIdAsync(fileId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<DomainFile>.NotFound()));

        var response = await sut.UpdateFileMetadata(
            fileId,
            new UpdateFileMetadataRequest(Name: "new.txt"),
            CancellationToken.None);

        GetStatusCode(response.Result).Should().Be(StatusCodes.Status404NotFound);
        await fileService.DidNotReceive()
            .UpdateMetadataAsync(Arg.Any<DomainFile>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task DeleteFile_WhenServiceSucceeds_ShouldReturnOk()
    {
        var fileId = Guid.NewGuid();
        fileService.DeleteAsync(fileId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success()));

        var response = await sut.DeleteFile(fileId, CancellationToken.None);

        GetStatusCode(response).Should().Be(StatusCodes.Status200OK);
        await fileService.Received(1).DeleteAsync(fileId, Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task DownloadFileContent_WhenRangeProvided_ShouldRequestExclusiveEndAndReturnFile()
    {
        var file = CreateFile(name: "report.pdf", contentType: "application/pdf");
        var content = new MemoryStream([1, 2, 3]);
        fileService.GetByIdAsync(file.Id, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success(file)));
        fileService.GetContentAsync(file.Id, 10, 21, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<(Stream Content, string ContentType, long SizeBytes)>(
                (content, "application/pdf", content.Length))));

        var response = await sut.DownloadFileContent(file.Id, "bytes= 10 - 20 ", CancellationToken.None);

        var fileResult = response.Should().BeOfType<FileStreamResult>().Subject;
        fileResult.FileDownloadName.Should().BeNullOrEmpty();
        fileResult.ContentType.Should().Be("application/pdf");
        await fileService.Received(1)
            .GetContentAsync(file.Id, 10, 21, Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task DownloadFileContent_WhenRangeIsInvalid_ShouldReturnBadRequestAndSkipService()
    {
        var fileId = Guid.NewGuid();

        var response = await sut.DownloadFileContent(fileId, "items=10-20", CancellationToken.None);

        var badRequest = response.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequest.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        await fileService.DidNotReceive()
            .GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ReplaceFileContent_WhenServiceSucceeds_ShouldReturnUpdatedFileDto()
    {
        var file = CreateFile(name: "updated.txt", contentType: "text/plain");
        var formFile = CreateFormFile("updated.txt", "text/plain", [1, 2, 3]);
        fileService.ReplaceContentAsync(file.Id, Arg.Any<Stream>(), "text/plain", Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success(file)));

        var response = await sut.ReplaceFileContent(file.Id, formFile, CancellationToken.None);

        var dto = GetOkValue<FileDto>(response);
        dto.Id.Should().Be(file.Id);
        dto.ContentType.Should().Be("text/plain");
        await fileService.Received(1)
            .ReplaceContentAsync(file.Id, Arg.Any<Stream>(), "text/plain", Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task UpdateTextContent_WhenServiceSucceeds_ShouldReturnUpdatedFileDto()
    {
        var file = CreateFile(name: "notes.txt");
        fileService.UpdateTextContentAsync(file.Id, "new content", Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success(file)));

        var response = await sut.UpdateTextContent(
            file.Id,
            new UpdateTextContentRequest("new content"),
            CancellationToken.None);

        GetOkValue<FileDto>(response).Id.Should().Be(file.Id);
        await fileService.Received(1)
            .UpdateTextContentAsync(file.Id, "new content", Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task MoveFile_WhenServiceSucceeds_ShouldReturnMovedFileDto()
    {
        var targetFolderId = Guid.NewGuid();
        var file = CreateFile(folderId: targetFolderId);
        fileService.MoveAsync(file.Id, targetFolderId, null, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success(file)));

        var response = await sut.MoveFile(
            file.Id,
            new MoveFileRequest(targetFolderId),
            CancellationToken.None);

        var dto = GetOkValue<FileDto>(response);
        dto.FolderId.Should().Be(targetFolderId);
        await fileService.Received(1)
            .MoveAsync(file.Id, targetFolderId, null, Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ReorderFile_WhenServiceSucceeds_ShouldReturnOk()
    {
        var fileId = Guid.NewGuid();
        fileService.ReorderAsync(fileId, 3, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success()));

        var response = await sut.ReorderFile(
            fileId,
            new ReorderFileRequest(3),
            CancellationToken.None);

        GetStatusCode(response).Should().Be(StatusCodes.Status200OK);
        await fileService.Received(1)
            .ReorderAsync(fileId, 3, Arg.Any<CancellationToken>());
    }

    private static DomainFile CreateFile(
        Guid? id = null,
        Guid? folderId = null,
        string name = "file.txt",
        string description = "description",
        string contentType = "text/plain")
    {
        return new DomainFile(
            id ?? Guid.NewGuid(),
            Guid.NewGuid(),
            folderId,
            name,
            description,
            contentType,
            12);
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
