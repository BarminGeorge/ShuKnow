using System.Text;
using Ardalis.Result;
using AwesomeAssertions;
using NSubstitute;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;
using ShuKnow.Application.Services;
using ShuKnow.Domain.Entities;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Tests.Services;

public class AiToolsServiceTests
{
    private IFolderService folderService = null!;
    private IFileService fileService = null!;
    private IWorkspacePathService workspacePathService = null!;
    private IAttachmentService attachmentService = null!;
    private IAttachmentFileService attachmentFileService = null!;
    private IChatNotificationService notificationService = null!;
    private ICurrentUserService currentUserService = null!;
    private Guid currentUserId;
    private AiToolsService sut = null!;

    [SetUp]
    public void SetUp()
    {
        folderService = Substitute.For<IFolderService>();
        fileService = Substitute.For<IFileService>();
        workspacePathService = Substitute.For<IWorkspacePathService>();
        attachmentService = Substitute.For<IAttachmentService>();
        attachmentFileService = Substitute.For<IAttachmentFileService>();
        notificationService = Substitute.For<IChatNotificationService>();
        currentUserService = Substitute.For<ICurrentUserService>();
        currentUserId = Guid.NewGuid();

        currentUserService.UserId.Returns(currentUserId);
        ConfigureDefaults();

        sut = new AiToolsService(
            folderService,
            fileService,
            workspacePathService,
            attachmentService,
            attachmentFileService,
            notificationService,
            currentUserService);
    }

    [Test]
    public async Task CreateFolderAsync_WhenPathIsValid_ShouldUseFolderServiceAndReturnSpecificMessage()
    {
        var folder = CreateFolder(name: "notes");
        folderService.CreateByPathAsync("notes", "My notes", "📝", Arg.Any<CancellationToken>())
            .Returns(Success(folder));

        var result = await sut.CreateFolderAsync("notes", "My notes", "📝");

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().Be("Created folder 'notes'.");
        await folderService.Received(1).CreateByPathAsync("notes", "My notes", "📝", Arg.Any<CancellationToken>());
        await notificationService.Received(1).SendFolderCreatedAsync(folder, Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task CreateFolderAsync_WhenPathIsMissingParent_ShouldPropagateFailure()
    {
        folderService.CreateByPathAsync("notes/daily", "Daily notes", "📝", Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<Folder>.NotFound("Folder 'notes' was not found.")));

        var result = await sut.CreateFolderAsync("notes/daily", "Daily notes", "📝");

        result.Status.Should().Be(ResultStatus.NotFound);
        result.Errors.Should().ContainSingle().Which.Should().Contain("notes");
        await notificationService.DidNotReceive().SendFolderCreatedAsync(Arg.Any<Folder>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task CreateTextFileAsync_WhenPathIsValid_ShouldUploadUtf8FileAndReturnSpecificMessage()
    {
        var path = new ResolvedFilePath("readme.txt", Guid.NewGuid(), "notes/readme.txt");
        var expectedBytes = Encoding.UTF8.GetBytes("Hello world");
        File? uploadedFile = null;
        byte[]? uploadedBytes = null;

        workspacePathService.ResolveFilePathAsync("notes/readme.txt", Arg.Any<CancellationToken>())
            .Returns(Success(path));
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

        var result = await sut.CreateTextFileAsync("notes/readme.txt", "Hello world");

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().Be("Created text file 'notes/readme.txt'.");
        uploadedFile.Should().NotBeNull();
        uploadedFile!.UserId.Should().Be(currentUserId);
        uploadedFile.FolderId.Should().Be(path.FolderId);
        uploadedFile.Name.Should().Be(path.FileName);
        uploadedFile.ContentType.Should().Be("text/plain");
        uploadedFile.SizeBytes.Should().Be(expectedBytes.Length);
        uploadedBytes.Should().Equal(expectedBytes);
        await notificationService.Received(1).SendFileCreatedAsync(uploadedFile!, Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task SaveAttachment_WhenAttachmentExists_ShouldUploadBlobAndReturnSpecificMessage()
    {
        var attachmentId = Guid.NewGuid();
        var path = new ResolvedFilePath("export.md", Guid.NewGuid(), "notes/export.md");
        var attachment = CreateAttachment(
            attachmentId: attachmentId,
            fileName: "draft.md",
            contentType: "text/markdown",
            sizeBytes: 7);
        var uploadedFile = CreateFile(
            folderId: path.FolderId,
            name: path.FileName,
            contentType: "text/markdown",
            sizeBytes: 7);

        workspacePathService.ResolveFilePathAsync("notes/export.md", Arg.Any<CancellationToken>())
            .Returns(Success(path));
        attachmentService.GetByIdsAsync(
                Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Single() == attachmentId),
                Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<IReadOnlyList<ChatAttachment>>([attachment])));
        attachmentFileService.SaveAttachmentToFileAsync(attachment, path, Arg.Any<CancellationToken>())
            .Returns(Success(uploadedFile));

        var result = await sut.SaveAttachment(attachmentId.ToString(), "notes/export.md");

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().Be("Saved attachment to 'notes/export.md'.");
        await attachmentFileService.Received(1).SaveAttachmentToFileAsync(
            attachment, path, Arg.Any<CancellationToken>());
        await notificationService.Received(1).SendAttachmentSavedAsync(
            attachment, uploadedFile.Name, Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task SaveAttachment_WhenAttachmentIdIsInvalid_ShouldReturnInvalid()
    {
        var result = await sut.SaveAttachment("not-a-guid", "notes/file.txt");

        result.Status.Should().Be(ResultStatus.Invalid);
        result.ValidationErrors.Should().ContainSingle().Which.ErrorMessage.Should().Contain("GUID");
        await attachmentService.DidNotReceive()
            .GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
        await workspacePathService.DidNotReceive().ResolveFilePathAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
        await notificationService.DidNotReceive().SendAttachmentSavedAsync(
            Arg.Any<ChatAttachment>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task AppendTextAsync_WhenFileExists_ShouldAppendTextAndReturnSpecificMessage()
    {
        var file = CreateFile(name: "readme.txt", contentType: "text/plain");
        string? updatedContent = null;

        fileService.GetByPathAsync("notes/readme.txt", Arg.Any<CancellationToken>()).Returns(Success(file));
        fileService.GetContentAsync(file.Id, Arg.Any<long?>(), Arg.Any<long?>(), Arg.Any<CancellationToken>())
            .Returns(Success<(Stream Content, string ContentType, long SizeBytes)>(
                (new MemoryStream(Encoding.UTF8.GetBytes("Hello")), "text/plain", 5L)));
        fileService.UpdateTextContentAsync(file.Id, Arg.Do<string>(content => updatedContent = content), Arg.Any<CancellationToken>())
            .Returns(Success(file));

        var result = await sut.AppendTextAsync("notes/readme.txt", " world");

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().Be("Appended text to 'notes/readme.txt'.");
        updatedContent.Should().Be("Hello world");
        await notificationService.Received(1).SendTextAppendedAsync(file, " world", Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task PrependTextAsync_WhenFileIsNotText_ShouldReturnInvalid()
    {
        var file = CreateFile(name: "manual.pdf", contentType: "application/pdf");
        fileService.GetByPathAsync("notes/manual.pdf", Arg.Any<CancellationToken>()).Returns(Success(file));

        var result = await sut.PrependTextAsync("notes/manual.pdf", "HEADER");

        result.Status.Should().Be(ResultStatus.Invalid);
        result.ValidationErrors.Should().ContainSingle().Which.ErrorMessage.Should().Contain("not a text file");
        await fileService.DidNotReceive()
            .GetContentAsync(Arg.Any<Guid>(), Arg.Any<long?>(), Arg.Any<long?>(), Arg.Any<CancellationToken>());
        await fileService.DidNotReceive()
            .UpdateTextContentAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
        await notificationService.DidNotReceive().SendTextPrependedAsync(
            Arg.Any<File>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task MoveFileAsync_WhenDestinationIsValid_ShouldResolveTargetMoveAndReturnSpecificMessage()
    {
        var file = CreateFile(name: "readme.txt", description: "docs", version: 3);
        var destination = new ResolvedFilePath("guide.txt", Guid.NewGuid(), "archive/guide.txt");
        var movedFile = CreateFile(
            fileId: file.Id,
            folderId: destination.FolderId,
            name: destination.FileName,
            description: file.Description,
            version: 4);

        fileService.GetByPathAsync("notes/readme.txt", Arg.Any<CancellationToken>()).Returns(Success(file));
        workspacePathService.ResolveFilePathAsync("archive/guide.txt", Arg.Any<CancellationToken>())
            .Returns(Success(destination));
        fileService.MoveAsync(file.Id, destination.FolderId, destination.FileName, Arg.Any<CancellationToken>())
            .Returns(Success(movedFile));

        var result = await sut.MoveFileAsync("notes/readme.txt", "archive/guide.txt");

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().Be("Moved file from 'notes/readme.txt' to 'archive/guide.txt'.");
        await fileService.Received(1).MoveAsync(file.Id, destination.FolderId, destination.FileName, Arg.Any<CancellationToken>());
        await notificationService.Received(1).SendFileMovedAsync(movedFile, file.FolderId, Arg.Any<CancellationToken>());
    }

    private void ConfigureDefaults()
    {
        folderService.CreateByPathAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<Folder>.NotFound()));
        workspacePathService.ResolveFilePathAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<ResolvedFilePath>.NotFound()));
        fileService.UploadAsync(Arg.Any<File>(), Arg.Any<Stream>(), Arg.Any<CancellationToken>())
            .Returns(call => Success(call.Arg<File>()));
        fileService.GetByPathAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<File>.NotFound()));
        fileService.GetContentAsync(Arg.Any<Guid>(), Arg.Any<long?>(), Arg.Any<long?>(), Arg.Any<CancellationToken>())
            .Returns(Success<(Stream Content, string ContentType, long SizeBytes)>(
                (new MemoryStream(), "text/plain", 0L)));
        fileService.UpdateTextContentAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(call => Success(CreateFile(fileId: call.Arg<Guid>())));
        fileService.MoveAsync(Arg.Any<Guid>(), Arg.Any<Guid?>(), Arg.Any<string?>(), Arg.Any<CancellationToken>())
            .Returns(call => Success(CreateFile(fileId: call.Arg<Guid>())));
        attachmentService.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success<IReadOnlyList<ChatAttachment>>([])));
        attachmentService.MarkConsumedAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(Success());
        attachmentFileService.SaveAttachmentToFileAsync(Arg.Any<ChatAttachment>(), Arg.Any<ResolvedFilePath>(), Arg.Any<CancellationToken>())
            .Returns(call => Success(CreateFile(
                folderId: call.Arg<ResolvedFilePath>().FolderId,
                name: call.Arg<ResolvedFilePath>().FileName)));
    }

    private static Folder CreateFolder(
        Guid? folderId = null,
        string name = "folder",
        string description = "description",
        Guid? parentFolderId = null,
        string? emoji = null)
    {
        return new Folder(
            folderId ?? Guid.NewGuid(),
            Guid.NewGuid(),
            name,
            description,
            parentFolderId,
            emoji: emoji);
    }

    private File CreateFile(
        Guid? fileId = null,
        Guid? folderId = null,
        string name = "file.txt",
        string description = "description",
        string contentType = "text/plain",
        long sizeBytes = 10,
        int version = 1)
    {
        return new File(
            fileId ?? Guid.NewGuid(),
            currentUserId,
            folderId ?? Guid.NewGuid(),
            name,
            description,
            contentType,
            sizeBytes,
            version);
    }

    private ChatAttachment CreateAttachment(
        Guid? attachmentId = null,
        string fileName = "file.txt",
        string contentType = "text/plain",
        long sizeBytes = 10)
    {
        return new ChatAttachment(
            attachmentId ?? Guid.NewGuid(),
            currentUserId,
            Guid.NewGuid(),
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
}
