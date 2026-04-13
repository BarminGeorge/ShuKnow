using Ardalis.Result;
using AwesomeAssertions;
using NSubstitute;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;
using ShuKnow.Application.Services;
using ShuKnow.Domain.Entities;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Tests.Services;

public class AttachmentFileServiceTests
{
    private IFileService fileService = null!;
    private IBlobStorageService blobStorageService = null!;
    private IAttachmentService attachmentService = null!;
    private ICurrentUserService currentUserService = null!;
    private Guid currentUserId;
    private AttachmentFileService sut = null!;

    [SetUp]
    public void SetUp()
    {
        fileService = Substitute.For<IFileService>();
        blobStorageService = Substitute.For<IBlobStorageService>();
        attachmentService = Substitute.For<IAttachmentService>();
        currentUserService = Substitute.For<ICurrentUserService>();
        currentUserId = Guid.NewGuid();

        currentUserService.UserId.Returns(currentUserId);
        ConfigureDefaults();

        sut = new AttachmentFileService(
            fileService,
            blobStorageService,
            attachmentService,
            currentUserService);
    }

    [Test]
    public async Task SaveAttachmentToFileAsync_WhenBlobExistsAndUploadSucceeds_ShouldUploadFileAndMarkConsumed()
    {
        var attachment = CreateAttachment(
            blobId: Guid.NewGuid(),
            fileName: "draft.md",
            contentType: "text/markdown",
            sizeBytes: 7);
        var path = new ResolvedFilePath("export.md", Guid.NewGuid(), "notes/export.md");
        var blobContent = new MemoryStream("payload"u8.ToArray());
        File? uploadedFile = null;
        byte[]? uploadedBytes = null;

        blobStorageService.GetAsync(attachment.BlobId, Arg.Any<CancellationToken>())
            .Returns(Success<Stream>(blobContent));
        fileService.UploadAsync(
                Arg.Do<File>(file => uploadedFile = file),
                Arg.Do<Stream>(stream =>
                {
                    using var copy = new MemoryStream();
                    stream.CopyTo(copy);
                    uploadedBytes = copy.ToArray();
                    stream.Position = 0;
                }),
                Arg.Any<CancellationToken>())
            .Returns(call => Success(call.Arg<File>()));

        var result = await sut.SaveAttachmentToFileAsync(attachment, path);

        result.Status.Should().Be(ResultStatus.Ok);
        uploadedFile.Should().NotBeNull();
        uploadedFile!.UserId.Should().Be(currentUserId);
        uploadedFile.FolderId.Should().Be(path.FolderId);
        uploadedFile.Name.Should().Be(path.FileName);
        uploadedFile.ContentType.Should().Be(attachment.ContentType);
        uploadedFile.SizeBytes.Should().Be(attachment.SizeBytes);
        uploadedBytes.Should().Equal("payload"u8.ToArray());
        await attachmentService.Received(1).MarkConsumedAsync(
            attachment.Id,
            Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task SaveAttachmentToFileAsync_WhenBlobRetrievalFails_ShouldReturnFileWithoutMarkingConsumed()
    {
        var attachment = CreateAttachment(
            blobId: Guid.NewGuid(),
            fileName: "image.png",
            contentType: "image/png",
            sizeBytes: 1024);
        var path = new ResolvedFilePath("export.png", Guid.NewGuid(), "notes/export.png");

        blobStorageService.GetAsync(attachment.BlobId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<Stream>.NotFound("Blob not found")));

        var result = await sut.SaveAttachmentToFileAsync(attachment, path);

        result.Status.Should().Be(ResultStatus.NotFound);
        await fileService.DidNotReceive().UploadAsync(Arg.Any<File>(), Arg.Any<Stream>(), Arg.Any<CancellationToken>());
        await attachmentService.DidNotReceive().MarkConsumedAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task SaveAttachmentToFileAsync_WhenUploadFails_ShouldReturnFailureWithoutMarkingConsumed()
    {
        var attachment = CreateAttachment(
            blobId: Guid.NewGuid(),
            fileName: "document.pdf",
            contentType: "application/pdf",
            sizeBytes: 512);
        var path = new ResolvedFilePath("export.pdf", Guid.NewGuid(), "notes/export.pdf");
        var blobContent = new MemoryStream([1, 2, 3, 4, 5]);

        blobStorageService.GetAsync(attachment.BlobId, Arg.Any<CancellationToken>())
            .Returns(Success<Stream>(blobContent));
        fileService.UploadAsync(Arg.Any<File>(), Arg.Any<Stream>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<File>.Error("Upload failed")));

        var result = await sut.SaveAttachmentToFileAsync(attachment, path);

        result.Status.Should().Be(ResultStatus.Error);
        await attachmentService.DidNotReceive().MarkConsumedAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task SaveAttachmentToFileAsync_ShouldBuildFileWithCorrectMetadata()
    {
        var attachment = CreateAttachment(
            blobId: Guid.NewGuid(),
            fileName: "report.xlsx",
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            sizeBytes: 2048);
        var path = new ResolvedFilePath("report.xlsx", Guid.NewGuid(), "reports/report.xlsx");
        var blobContent = new MemoryStream([0, 1, 2]);
        File? capturedFile = null;

        blobStorageService.GetAsync(attachment.BlobId, Arg.Any<CancellationToken>())
            .Returns(Success<Stream>(blobContent));
        fileService.UploadAsync(
                Arg.Do<File>(file => capturedFile = file),
                Arg.Any<Stream>(),
                Arg.Any<CancellationToken>())
            .Returns(call => Success(call.Arg<File>()));

        await sut.SaveAttachmentToFileAsync(attachment, path);

        capturedFile.Should().NotBeNull();
        capturedFile!.UserId.Should().Be(currentUserId);
        capturedFile.FolderId.Should().Be(path.FolderId);
        capturedFile.Name.Should().Be(path.FileName);
        capturedFile.Description.Should().BeEmpty();
        capturedFile.ContentType.Should().Be(attachment.ContentType);
        capturedFile.SizeBytes.Should().Be(attachment.SizeBytes);
    }

    [Test]
    public async Task SaveAttachmentToFileAsync_ShouldUseProvidedFileNameNotAttachmentFileName()
    {
        var attachment = CreateAttachment(
            blobId: Guid.NewGuid(),
            fileName: "original-name.txt",
            contentType: "text/plain",
            sizeBytes: 100);
        var path = new ResolvedFilePath("renamed.txt", Guid.NewGuid(), "docs/renamed.txt");
        var blobContent = new MemoryStream([1, 2, 3]);
        File? capturedFile = null;

        blobStorageService.GetAsync(attachment.BlobId, Arg.Any<CancellationToken>())
            .Returns(Success<Stream>(blobContent));
        fileService.UploadAsync(
                Arg.Do<File>(file => capturedFile = file),
                Arg.Any<Stream>(),
                Arg.Any<CancellationToken>())
            .Returns(call => Success(call.Arg<File>()));

        await sut.SaveAttachmentToFileAsync(attachment, path);

        capturedFile!.Name.Should().Be("renamed.txt");
        capturedFile.Name.Should().NotBe(attachment.FileName);
    }

    [Test]
    public async Task SaveAttachmentToFileAsync_ShouldMarkOnlyTheProcessedAttachmentAsConsumed()
    {
        var attachment = CreateAttachment(
            blobId: Guid.NewGuid(),
            fileName: "unique-file.txt",
            contentType: "text/plain",
            sizeBytes: 50);
        var path = new ResolvedFilePath("file.txt", Guid.NewGuid(), "folder/file.txt");
        var blobContent = new MemoryStream([4, 5, 6]);

        blobStorageService.GetAsync(attachment.BlobId, Arg.Any<CancellationToken>())
            .Returns(Success<Stream>(blobContent));
        fileService.UploadAsync(Arg.Any<File>(), Arg.Any<Stream>(), Arg.Any<CancellationToken>())
            .Returns(call => Success(call.Arg<File>()));

        await sut.SaveAttachmentToFileAsync(attachment, path);

        await attachmentService.Received(1).MarkConsumedAsync(
            attachment.Id,
            Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task SaveAttachmentToFileAsync_ShouldPropagateUploadErrorDetails()
    {
        var attachment = CreateAttachment(
            blobId: Guid.NewGuid(),
            fileName: "test.txt",
            contentType: "text/plain",
            sizeBytes: 10);
        var path = new ResolvedFilePath("test.txt", Guid.NewGuid(), "folder/test.txt");
        var blobContent = new MemoryStream([7, 8, 9]);

        blobStorageService.GetAsync(attachment.BlobId, Arg.Any<CancellationToken>())
            .Returns(Success<Stream>(blobContent));
        fileService.UploadAsync(Arg.Any<File>(), Arg.Any<Stream>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<File>.Invalid(new ValidationError("File already exists"))));

        var result = await sut.SaveAttachmentToFileAsync(attachment, path);

        result.Status.Should().Be(ResultStatus.Invalid);
        result.ValidationErrors.Should().ContainSingle().Which.ErrorMessage.Should().Be("File already exists");
        await attachmentService.DidNotReceive().MarkConsumedAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task SaveAttachmentToFileAsync_ShouldPassCancellationTokenThroughChain()
    {
        var attachment = CreateAttachment();
        var path = new ResolvedFilePath("file.txt", Guid.NewGuid(), "folder/file.txt");
        var blobContent = new MemoryStream([1]);
        var ct = new CancellationTokenSource(TimeSpan.FromSeconds(5)).Token;

        blobStorageService.GetAsync(attachment.BlobId, ct)
            .Returns(Success<Stream>(blobContent));
        fileService.UploadAsync(Arg.Any<File>(), Arg.Any<Stream>(), ct)
            .Returns(call => Success(call.Arg<File>()));

        await sut.SaveAttachmentToFileAsync(attachment, path, ct);

        await blobStorageService.Received(1).GetAsync(attachment.BlobId, ct);
        await fileService.Received(1).UploadAsync(Arg.Any<File>(), Arg.Any<Stream>(), ct);
    }

    [Test]
    public async Task SaveAttachmentToFileAsync_WhenMarkConsumedFails_ShouldStillReturnUploadSuccess()
    {
        var attachment = CreateAttachment(
            blobId: Guid.NewGuid(),
            fileName: "file.txt",
            contentType: "text/plain",
            sizeBytes: 25);
        var path = new ResolvedFilePath("file.txt", Guid.NewGuid(), "folder/file.txt");
        var blobContent = new MemoryStream([10, 11, 12]);

        blobStorageService.GetAsync(attachment.BlobId, Arg.Any<CancellationToken>())
            .Returns(Success<Stream>(blobContent));
        fileService.UploadAsync(Arg.Any<File>(), Arg.Any<Stream>(), Arg.Any<CancellationToken>())
            .Returns(call => Success(call.Arg<File>()));
        attachmentService.MarkConsumedAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Error("Attachment already consumed")));

        var result = await sut.SaveAttachmentToFileAsync(attachment, path);

        result.Status.Should().Be(ResultStatus.Ok);
        await attachmentService.Received(1).MarkConsumedAsync(
            attachment.Id,
            Arg.Any<CancellationToken>());
    }

    private ChatAttachment CreateAttachment(
        Guid? attachmentId = null,
        Guid? blobId = null,
        string fileName = "file.txt",
        string contentType = "text/plain",
        long sizeBytes = 128)
    {
        return new ChatAttachment(
            attachmentId ?? Guid.NewGuid(),
            currentUserId,
            blobId ?? Guid.NewGuid(),
            fileName,
            contentType,
            sizeBytes);
    }

    private static Task<Result> Success()
    {
        return Task.FromResult(Result.Success());
    }

    private static Task<Result<T>> Success<T>(T value)
    {
        return Task.FromResult(Result.Success(value));
    }

    private void ConfigureDefaults()
    {
        blobStorageService.GetAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Success<Stream>(new MemoryStream()));
        fileService.UploadAsync(Arg.Any<File>(), Arg.Any<Stream>(), Arg.Any<CancellationToken>())
            .Returns(call => Success(call.Arg<File>()));
        attachmentService.MarkConsumedAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Success());
    }
}
