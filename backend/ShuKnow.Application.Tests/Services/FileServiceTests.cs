using System.Text;
using Ardalis.Result;
using AwesomeAssertions;
using NSubstitute;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;
using ShuKnow.Application.Services;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Errors;
using ShuKnow.Domain.Repositories;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Tests.Services;

public class FileServiceTests
{
    private IFileRepository fileRepository = null!;
    private IFolderRepository folderRepository = null!;
    private IWorkspacePathService workspacePathService = null!;
    private IBlobStorageService blobStorageService = null!;
    private IBlobDeletionQueue blobDeletionQueue = null!;
    private ICurrentUserService currentUserService = null!;
    private IUnitOfWork unitOfWork = null!;
    private Guid currentUserId;
    private FileService sut = null!;

    [SetUp]
    public void SetUp()
    {
        fileRepository = Substitute.For<IFileRepository>();
        folderRepository = Substitute.For<IFolderRepository>();
        workspacePathService = Substitute.For<IWorkspacePathService>();
        blobStorageService = Substitute.For<IBlobStorageService>();
        blobDeletionQueue = Substitute.For<IBlobDeletionQueue>();
        currentUserService = Substitute.For<ICurrentUserService>();
        unitOfWork = Substitute.For<IUnitOfWork>();
        currentUserId = Guid.NewGuid();

        currentUserService.UserId.Returns(currentUserId);
        ConfigureDefaults();

        sut = new FileService(
            fileRepository,
            folderRepository,
            workspacePathService,
            blobStorageService,
            blobDeletionQueue,
            currentUserService,
            unitOfWork);
    }

    [Test]
    public async Task GetByIdAsync_WhenCalled_ShouldReturnRepositoryResultForCurrentUser()
    {
        var file = CreateFile();
        ReturnsExistingFile(file);

        var result = await sut.GetByIdAsync(file.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(file);
        await fileRepository.Received(1).GetByIdAsync(file.Id, currentUserId);
    }

    [Test]
    public async Task GetByPathAsync_WhenFileExists_ShouldResolvePathAndReturnMatchingFile()
    {
        var folderId = Guid.NewGuid();
        var path = new ResolvedFilePath("readme.txt", folderId, "notes/readme.txt");
        var file = CreateFile(folderId: folderId, name: "readme.txt");

        workspacePathService.ResolveFilePathAsync("notes/readme.txt", Arg.Any<CancellationToken>())
            .Returns(Success(path));
        fileRepository.GetByFolderAndFileNameAsync(folderId, currentUserId, "readme.txt")
            .Returns(Success(file));

        var result = await sut.GetByPathAsync("notes/readme.txt");

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(file);
        await workspacePathService.Received(1).ResolveFilePathAsync("notes/readme.txt", Arg.Any<CancellationToken>());
        await fileRepository.Received(1).GetByFolderAndFileNameAsync(folderId, currentUserId, "readme.txt");
    }

    [Test]
    public async Task GetByPathAsync_WhenFileDoesNotExist_ShouldReturnNotFound()
    {
        var folderId = Guid.NewGuid();
        var path = new ResolvedFilePath("missing.txt", folderId, "notes/missing.txt");

        workspacePathService.ResolveFilePathAsync("notes/missing.txt", Arg.Any<CancellationToken>())
            .Returns(Success(path));
        fileRepository.GetByFolderAndFileNameAsync(folderId, currentUserId, "missing.txt")
            .Returns(NotFound<File>());

        var result = await sut.GetByPathAsync("notes/missing.txt");

        result.Status.Should().Be(ResultStatus.NotFound);
        await workspacePathService.Received(1).ResolveFilePathAsync("notes/missing.txt", Arg.Any<CancellationToken>());
        await fileRepository.Received(1).GetByFolderAndFileNameAsync(folderId, currentUserId, "missing.txt");
    }

    [Test]
    public async Task ListByFolderAsync_WhenCalled_ShouldReturnRepositoryResultForCurrentUserAndPagination()
    {
        var folderId = Guid.NewGuid();
        IReadOnlyList<File> files = [CreateFile(folderId: folderId), CreateFile(folderId: folderId)];
        const int page = 2;
        const int pageSize = 25;
        const int totalCount = 41;

        fileRepository.ListByFolderAsync(folderId, currentUserId, page, pageSize)
            .Returns(Success((files, totalCount)));

        var result = await sut.ListByFolderAsync(folderId, page, pageSize);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Files.Should().BeEquivalentTo(files);
        result.Value.TotalCount.Should().Be(totalCount);
        await fileRepository.Received(1).ListByFolderAsync(folderId, currentUserId, page, pageSize);
    }

    [Test]
    public async Task ListByFolderAsync_WhenPageIsLessThanOne_ShouldReturnInvalid()
    {
        fileRepository.ListByFolderAsync(Arg.Any<Guid?>(), currentUserId, 0, 50)
            .Returns(Task.FromResult(Result<(IReadOnlyList<File> Files, int TotalCount)>.Invalid()));

        var result = await sut.ListByFolderAsync(Guid.NewGuid(), 0, 50);

        result.Status.Should().Be(ResultStatus.Invalid);
        await fileRepository.Received(1)
            .ListByFolderAsync(Arg.Any<Guid?>(), Arg.Any<Guid>(), Arg.Any<int>(), Arg.Any<int>());
    }

    [Test]
    public async Task ListByFolderAsync_WhenPageSizeIsLessThanOne_ShouldReturnInvalid()
    {
        fileRepository.ListByFolderAsync(Arg.Any<Guid?>(), currentUserId, 1, 0)
            .Returns(Task.FromResult(Result<(IReadOnlyList<File> Files, int TotalCount)>.Invalid()));

        var result = await sut.ListByFolderAsync(Guid.NewGuid(), 1, 0);

        result.Status.Should().Be(ResultStatus.Invalid);
        await fileRepository.Received(1)
            .ListByFolderAsync(Arg.Any<Guid?>(), Arg.Any<Guid>(), Arg.Any<int>(), Arg.Any<int>());
    }

    [Test]
    public async Task UploadAsync_WhenFolderDoesNotExist_ShouldReturnNotFound()
    {
        var file = CreateFile();
        using var content = CreateStream("payload");
        ReturnsFolderExists(file.FolderId, exists: false);

        var result = await sut.UploadAsync(file, content);

        result.Status.Should().Be(ResultStatus.NotFound);
        await AssertUploadDidNotPersistAsync();
    }

    [Test]
    public async Task UploadAsync_WhenFileNameAlreadyExistsInFolder_ShouldReturnConflict()
    {
        var file = CreateFile();
        using var content = CreateStream("payload");
        ReturnsFolderExists(file.FolderId);
        ReturnsFileNameExists(file.Name, file.FolderId, file.Id);

        var result = await sut.UploadAsync(file, content);

        result.Status.Should().Be(ResultStatus.Conflict);
        await AssertUploadDidNotPersistAsync();
    }

    [Test]
    public async Task UploadAsync_WhenRequestIsValid_ShouldPersistMetadataAndBlob()
    {
        var file = CreateFile();
        using var content = CreateStream("payload");
        ReturnsFolderExists(file.FolderId);
        ReturnsFileNameAvailable(file.Name, file.FolderId, file.Id);
        fileRepository.AddAsync(file).Returns(Success());
        fileRepository.GetByIdAsync(file.Id, currentUserId).Returns(Success(file));
        blobStorageService.SaveAsync(content, Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(Success());

        var result = await sut.UploadAsync(file, content);

        result.Status.Should().Be(ResultStatus.Created);
        result.Value.Should().BeSameAs(file);
        file.BlobId.Should().NotBe(Guid.Empty);
        await fileRepository.Received(1).AddAsync(file);
        await blobStorageService.Received(1).SaveAsync(content, file.BlobId, Arg.Any<CancellationToken>());
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task UploadAsync_WhenFileBelongsToFolder_ShouldReturnReloadedFileWithFolderNavigation()
    {
        var folderId = Guid.NewGuid();
        var file = CreateFile(folderId: folderId);
        var uploadedFile = CreateFile(fileId: file.Id, folderId: folderId);
        var folder = new Folder(folderId, currentUserId, "Docs", "description");
        typeof(File).GetProperty(nameof(File.Folder))!.SetValue(uploadedFile, folder);

        using var content = CreateStream("payload");
        ReturnsFolderExists(folderId);
        ReturnsFileNameAvailable(file.Name, file.FolderId, file.Id);
        fileRepository.AddAsync(file).Returns(Success());
        fileRepository.GetByIdAsync(file.Id, currentUserId).Returns(Success(uploadedFile));
        blobStorageService.SaveAsync(content, Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(Success());

        var result = await sut.UploadAsync(file, content);

        result.Status.Should().Be(ResultStatus.Created);
        result.Value.Should().BeSameAs(uploadedFile);
        result.Value.Folder.Should().NotBeNull();
        result.Value.Folder!.Name.Should().Be("Docs");
        await fileRepository.Received(1).GetByIdAsync(file.Id, currentUserId);
    }

    [Test]
    public async Task UploadAsync_WhenFileIsAtRoot_ShouldPersistWithoutCheckingFolderExistence()
    {
        var file = CreateFile(useRoot: true);
        using var content = CreateStream("payload");
        ReturnsFileNameAvailable(file.Name, file.FolderId, file.Id);
        fileRepository.AddAsync(file).Returns(Success());
        blobStorageService.SaveAsync(content, Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(Success());

        var result = await sut.UploadAsync(file, content);

        result.Status.Should().Be(ResultStatus.Created);
        result.Value.Should().BeSameAs(file);
        file.FolderId.Should().BeNull();
        await folderRepository.DidNotReceive().ExistsByIdAsync(Arg.Any<Guid>(), Arg.Any<Guid>());
        await fileRepository.Received(1).AddAsync(file);
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task UpdateMetadataAsync_WhenNewNameAlreadyExists_ShouldReturnConflict()
    {
        var existingFile = CreateFile(name: "old-name.txt", description: "old description");
        var updatedFile = CreateFile(
            fileId: existingFile.Id,
            folderId: existingFile.FolderId,
            name: "new-name.txt",
            description: "new description");

        ReturnsExistingFileForUpdate(existingFile);
        ReturnsFileNameAvailable("old-name.txt", existingFile.FolderId, existingFile.Id);
        ReturnsFileNameExists(updatedFile.Name, existingFile.FolderId, existingFile.Id);

        var result = await sut.UpdateMetadataAsync(updatedFile);

        result.Status.Should().Be(ResultStatus.Conflict);
        existingFile.Name.Should().Be("old-name.txt");
        existingFile.Description.Should().Be("old description");
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task UpdateMetadataAsync_WhenRequestIsValid_ShouldUpdateMetadataAndSaveChanges()
    {
        var existingFile = CreateFile(name: "old-name.txt", description: "old description");
        var updatedFile = CreateFile(
            fileId: existingFile.Id,
            folderId: existingFile.FolderId,
            name: "new-name.txt",
            description: "new description");

        ReturnsExistingFileForUpdate(existingFile);
        ReturnsFileNameAvailable(updatedFile.Name, existingFile.FolderId, existingFile.Id);

        var result = await sut.UpdateMetadataAsync(updatedFile);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(existingFile);
        existingFile.Name.Should().Be(updatedFile.Name);
        existingFile.Description.Should().Be(updatedFile.Description);
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task DeleteAsync_WhenFileExists_ShouldDeleteMetadataAndCommit()
    {
        var file = CreateFile();
        file.BlobId = Guid.NewGuid();
        ReturnsExistingFile(file);
        fileRepository.DeleteAsync(file.Id, currentUserId).Returns(Success());

        var result = await sut.DeleteAsync(file.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        await fileRepository.Received(1).DeleteAsync(file.Id, currentUserId);
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task DeleteAsync_WhenCommitSucceeds_ShouldDeleteBlobBestEffort()
    {
        var file = CreateFile();
        file.BlobId = Guid.NewGuid();
        ReturnsExistingFile(file);
        fileRepository.DeleteAsync(file.Id, currentUserId).Returns(Success());

        var result = await sut.DeleteAsync(file.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        await blobDeletionQueue.Received(1).EnqueueDeleteAsync(file.BlobId);
    }

    [Test]
    public async Task GetContentAsync_WhenNoRangeIsRequested_ShouldReturnFullContent()
    {
        var file = CreateFile(sizeBytes: 12, contentType: "text/plain");
        file.BlobId = Guid.NewGuid();
        using var stream = CreateStream("full content");
        ReturnsExistingFile(file);
        blobStorageService.GetAsync(file.BlobId, Arg.Any<CancellationToken>()).Returns(Success<Stream>(stream));

        var result = await sut.GetContentAsync(file.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Content.Should().BeSameAs(stream);
        result.Value.ContentType.Should().Be(file.ContentType);
        result.Value.SizeBytes.Should().Be(file.SizeBytes);
        await blobStorageService.Received(1).GetAsync(file.BlobId, Arg.Any<CancellationToken>());
        await blobStorageService.DidNotReceive()
            .GetRangeAsync(Arg.Any<Guid>(), Arg.Any<long>(), Arg.Any<long>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task GetContentAsync_WhenPartialRangeIsRequested_ShouldRequestBlobRange()
    {
        var file = CreateFile(sizeBytes: 512, contentType: "application/pdf");
        file.BlobId = Guid.NewGuid();
        using var stream = CreateStream("range");
        const long rangeStart = 128;

        ReturnsExistingFile(file);
        blobStorageService.GetRangeAsync(file.BlobId, rangeStart, file.SizeBytes, Arg.Any<CancellationToken>())
            .Returns(Success<Stream>(stream));

        var result = await sut.GetContentAsync(file.Id, rangeStart);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Content.Should().BeSameAs(stream);
        await blobStorageService.Received(1)
            .GetRangeAsync(file.BlobId, rangeStart, file.SizeBytes, Arg.Any<CancellationToken>());
        await blobStorageService.DidNotReceive().GetAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ReplaceContentAsync_WhenFileDoesNotExist_ShouldReturnNotFound()
    {
        var fileId = Guid.NewGuid();
        using var content = CreateStream("payload");
        fileRepository.GetByIdForUpdateAsync(fileId, currentUserId).Returns(NotFound<File>());

        var result = await sut.ReplaceContentAsync(fileId, content, "application/octet-stream");

        result.Status.Should().Be(ResultStatus.NotFound);
        await blobStorageService.DidNotReceive()
            .SaveAsync(Arg.Any<Stream>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task ReplaceContentAsync_WhenRequestIsValid_ShouldSaveNewBlobAndUpdateFileMetadata()
    {
        var existingFile = CreateFile(contentType: "text/plain", sizeBytes: 3, version: 2);
        var originalBlobId = Guid.NewGuid();
        existingFile.BlobId = originalBlobId;
        using var content = CreateStream("updated payload");
        var expectedBytes = "updated payload"u8.ToArray();
        byte[]? uploadedBytes = null;
        long? uploadedPosition = null;

        ReturnsExistingFileForUpdate(existingFile);
        blobStorageService
            .SaveAsync(Arg.Do<Stream>(stream =>
            {
                uploadedPosition = stream.Position;
                using var copy = new MemoryStream();
                stream.CopyTo(copy);
                uploadedBytes = copy.ToArray();
                stream.Position = 0;
            }), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Success());

        var result = await sut.ReplaceContentAsync(existingFile.Id, content, "application/json");

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(existingFile);
        existingFile.ContentType.Should().Be("application/json");
        existingFile.SizeBytes.Should().Be(expectedBytes.Length);
        existingFile.Version.Should().Be(3);
        existingFile.BlobId.Should().NotBe(originalBlobId);
        existingFile.BlobId.Should().NotBe(Guid.Empty);
        uploadedPosition.Should().Be(0);
        uploadedBytes.Should().Equal(expectedBytes);
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task ReplaceContentAsync_WhenCommitSucceeds_ShouldDeletePreviousBlobBestEffort()
    {
        var existingFile = CreateFile(contentType: "text/plain", sizeBytes: 3, version: 2);
        var originalBlobId = Guid.NewGuid();
        existingFile.BlobId = originalBlobId;
        using var content = CreateStream("updated payload");

        ReturnsExistingFileForUpdate(existingFile);
        blobStorageService.SaveAsync(Arg.Any<Stream>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Success());

        var result = await sut.ReplaceContentAsync(existingFile.Id, content, "application/json");

        result.Status.Should().Be(ResultStatus.Ok);
        await blobDeletionQueue.Received(1).EnqueueDeleteAsync(originalBlobId);
    }

    [Test]
    public async Task ReplaceContentAsync_WhenBlobSaveFails_ShouldNotMutateTrackedFile()
    {
        var existingFile = CreateFile(contentType: "text/plain", sizeBytes: 3, version: 2);
        var originalBlobId = Guid.NewGuid();
        existingFile.BlobId = originalBlobId;
        using var content = CreateStream("updated payload");

        ReturnsExistingFileForUpdate(existingFile);
        blobStorageService.SaveAsync(Arg.Any<Stream>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Error("storage error")));

        var result = await sut.ReplaceContentAsync(existingFile.Id, content, "application/json");

        result.Status.Should().Be(ResultStatus.Error);
        existingFile.ContentType.Should().Be("text/plain");
        existingFile.SizeBytes.Should().Be(3);
        existingFile.Version.Should().Be(2);
        existingFile.BlobId.Should().Be(originalBlobId);
        await unitOfWork.DidNotReceive().SaveChangesAsync();
        await blobDeletionQueue.DidNotReceive().EnqueueDeleteAsync(Arg.Any<Guid>());
    }

    [Test]
    public async Task ReplaceContentAsync_WhenInputIsSeekable_ShouldUploadOriginalStreamWithoutBuffering()
    {
        var existingFile = CreateFile(contentType: "text/plain", sizeBytes: 3, version: 2);
        existingFile.BlobId = Guid.NewGuid();
        using var content = CreateStream("updated payload");
        content.Position = 8;

        ReturnsExistingFileForUpdate(existingFile);
        blobStorageService.SaveAsync(Arg.Any<Stream>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Success());

        var result = await sut.ReplaceContentAsync(existingFile.Id, content, "application/json");

        result.Status.Should().Be(ResultStatus.Ok);
        existingFile.SizeBytes.Should().Be(content.Length - 8);
        await blobStorageService.Received(1).SaveAsync(content, Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task MoveAsync_WhenTargetFolderDoesNotExist_ShouldReturnNotFound()
    {
        var fileId = Guid.NewGuid();
        var targetFolderId = Guid.NewGuid();
        ReturnsFolderExists(targetFolderId, exists: false);

        var result = await sut.MoveAsync(fileId, targetFolderId);

        result.Status.Should().Be(ResultStatus.NotFound);
        await fileRepository.DidNotReceive().GetByIdForUpdateAsync(Arg.Any<Guid>(), Arg.Any<Guid>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task MoveAsync_WhenFileNameAlreadyExistsInTargetFolder_ShouldReturnConflict()
    {
        var file = CreateFile(name: "report.pdf");
        var targetFolderId = Guid.NewGuid();

        ReturnsFolderExists(targetFolderId);
        ReturnsExistingFileForUpdate(file);
        ReturnsFileNameExists(file.Name, targetFolderId, file.Id);

        var result = await sut.MoveAsync(file.Id, targetFolderId);

        result.Status.Should().Be(ResultStatus.Conflict);
        file.FolderId.Should().NotBe(targetFolderId);
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task MoveAsync_WhenRequestIsValid_ShouldMoveFileAndSaveChanges()
    {
        var file = CreateFile(name: "report.pdf", version: 4);
        var originalFolderId = file.FolderId;
        var targetFolderId = Guid.NewGuid();

        ReturnsFolderExists(targetFolderId);
        ReturnsExistingFileForUpdate(file);
        ReturnsFileNameAvailable(file.Name, targetFolderId, file.Id);

        var result = await sut.MoveAsync(file.Id, targetFolderId);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(file);
        file.FolderId.Should().Be(targetFolderId);
        file.FolderId.Should().NotBe(originalFolderId!.Value);
        file.Version.Should().Be(5);
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task MoveAsync_WhenTargetFileNameIsProvided_ShouldRenameAndMoveFile()
    {
        var file = CreateFile(name: "report.pdf", description: "Quarterly report", version: 4);
        var targetFolderId = Guid.NewGuid();

        ReturnsFolderExists(targetFolderId);
        ReturnsExistingFileForUpdate(file);
        ReturnsFileNameAvailable("report-final.pdf", targetFolderId, file.Id);

        var result = await sut.MoveAsync(file.Id, targetFolderId, "report-final.pdf");

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(file);
        file.Name.Should().Be("report-final.pdf");
        file.Description.Should().Be("Quarterly report");
        file.FolderId.Should().Be(targetFolderId);
        file.Version.Should().Be(5);
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task MoveAsync_WhenTargetFolderIsRoot_ShouldMoveFileWithoutCheckingFolderExistence()
    {
        var file = CreateFile(name: "report.pdf", version: 4);
        var originalFolderId = file.FolderId;

        ReturnsExistingFileForUpdate(file);
        ReturnsFileNameAvailable(file.Name, null, file.Id);

        var result = await sut.MoveAsync(file.Id, null);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(file);
        file.FolderId.Should().BeNull();
        file.Version.Should().Be(5);
        originalFolderId.Should().NotBeNull();
        await folderRepository.DidNotReceive().ExistsByIdAsync(Arg.Any<Guid>(), Arg.Any<Guid>());
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task MoveAsync_WhenTargetFolderAndNameAreUnchanged_ShouldReturnFileWithoutSaving()
    {
        var file = CreateFile(name: "report.pdf", version: 4);

        ReturnsFolderExists(file.FolderId);
        ReturnsExistingFileForUpdate(file);
        ReturnsFileNameAvailable(file.Name, file.FolderId, file.Id);

        var result = await sut.MoveAsync(file.Id, file.FolderId, file.Name);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(file);
        file.Name.Should().Be("report.pdf");
        file.Version.Should().Be(4);
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task DeleteByFolderAsync_WhenFolderHasFiles_ShouldDeleteRecordsAndCommit()
    {
        var folderId = Guid.NewGuid();
        var firstFile = CreateFile(folderId: folderId);
        firstFile.BlobId = Guid.NewGuid();
        var secondFile = CreateFile(folderId: folderId);
        secondFile.BlobId = Guid.NewGuid();

        ReturnsFolderExists(folderId);
        fileRepository.DeleteByFolderAsync(folderId, currentUserId)
            .Returns(Success<IReadOnlyList<File>>([firstFile, secondFile]));

        var result = await sut.DeleteByFolderAsync(folderId);

        result.Status.Should().Be(ResultStatus.Ok);
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task DeleteByFolderAsync_WhenAllBlobDeletesSucceed_ShouldDeleteAllBlobsAndSaveChanges()
    {
        var folderId = Guid.NewGuid();
        var firstFile = CreateFile(folderId: folderId);
        firstFile.BlobId = Guid.NewGuid();
        var secondFile = CreateFile(folderId: folderId);
        secondFile.BlobId = Guid.NewGuid();

        ReturnsFolderExists(folderId);
        fileRepository.DeleteByFolderAsync(folderId, currentUserId)
            .Returns(Success<IReadOnlyList<File>>([firstFile, secondFile]));

        var result = await sut.DeleteByFolderAsync(folderId);

        result.Status.Should().Be(ResultStatus.Ok);
        await unitOfWork.Received(1).SaveChangesAsync();
        await blobDeletionQueue.Received(1).EnqueueDeleteAsync(firstFile.BlobId);
        await blobDeletionQueue.Received(1).EnqueueDeleteAsync(secondFile.BlobId);
    }

    [Test]
    public async Task DeleteByFolderAsync_WhenFolderIsRoot_ShouldDeleteRootFilesWithoutCheckingFolderExistence()
    {
        var firstFile = CreateFile(useRoot: true);
        firstFile.BlobId = Guid.NewGuid();
        var secondFile = CreateFile(useRoot: true);
        secondFile.BlobId = Guid.NewGuid();

        fileRepository.DeleteByFolderAsync(null, currentUserId)
            .Returns(Success<IReadOnlyList<File>>([firstFile, secondFile]));

        var result = await sut.DeleteByFolderAsync(null);

        result.Status.Should().Be(ResultStatus.Ok);
        await folderRepository.DidNotReceive().ExistsByIdAsync(Arg.Any<Guid>(), Arg.Any<Guid>());
        await unitOfWork.Received(1).SaveChangesAsync();
        await blobDeletionQueue.Received(1).EnqueueDeleteAsync(firstFile.BlobId);
        await blobDeletionQueue.Received(1).EnqueueDeleteAsync(secondFile.BlobId);
    }

    [Test]
    public async Task ReorderAsync_WhenFileDoesNotExist_ShouldReturnNotFound()
    {
        var fileId = Guid.NewGuid();

        var result = await sut.ReorderAsync(fileId, 0);

        result.Status.Should().Be(ResultStatus.NotFound);
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task ReorderAsync_WhenPositionIsNegative_ShouldReturnInvalid()
    {
        var folderId = Guid.NewGuid();
        var file = CreateFile(folderId: folderId, sortOrder: 0);
        ReturnsExistingFileForUpdate(file);
        fileRepository.GetByFolderAsync(file.FolderId, currentUserId).Returns(Success<IReadOnlyList<File>>([file]));

        var result = await sut.ReorderAsync(file.Id, -1);

        result.Status.Should().Be(ResultStatus.Invalid);
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task ReorderAsync_WhenPositionExceedsSiblingCount_ShouldReturnInvalid()
    {
        var folderId = Guid.NewGuid();
        var file = CreateFile(folderId: folderId, sortOrder: 0);
        ReturnsExistingFileForUpdate(file);
        fileRepository.GetByFolderAsync(file.FolderId, currentUserId).Returns(Success<IReadOnlyList<File>>([file]));

        var result = await sut.ReorderAsync(file.Id, 1);

        result.Status.Should().Be(ResultStatus.Invalid);
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task ReorderAsync_WhenRequestIsValid_ShouldReorderSiblingsAndSaveChanges()
    {
        var folderId = Guid.NewGuid();
        var fileA = CreateFile(folderId: folderId, name: "a.txt", sortOrder: 0);
        var fileB = CreateFile(folderId: folderId, name: "b.txt", sortOrder: 1);
        var fileC = CreateFile(folderId: folderId, name: "c.txt", sortOrder: 2);
        var subfolder = CreateFolder(parentFolderId: folderId, sortOrder: 3);

        ReturnsExistingFileForUpdate(fileC);
        fileRepository.GetByFolderAsync(folderId, currentUserId)
            .Returns(Success<IReadOnlyList<File>>([fileA, fileB, fileC]));
        folderRepository.GetChildrenAsync(folderId, currentUserId)
            .Returns(Success<IReadOnlyList<Folder>>([subfolder]));

        var result = await sut.ReorderAsync(fileC.Id, 0);

        result.Status.Should().Be(ResultStatus.Ok);
        fileC.SortOrder.Should().Be(0);
        fileA.SortOrder.Should().Be(1);
        fileB.SortOrder.Should().Be(2);
        subfolder.SortOrder.Should().Be(3);
        await fileRepository.Received(1).UpdateRangeAsync(Arg.Is<IReadOnlyList<File>>(files =>
            files.Count == 3 &&
            files.Any(file => file.Id == fileC.Id && file.SortOrder == 0) &&
            files.Any(file => file.Id == fileA.Id && file.SortOrder == 1) &&
            files.Any(file => file.Id == fileB.Id && file.SortOrder == 2)));
        await folderRepository.Received(1).UpdateRangeAsync(Arg.Is<IReadOnlyList<Folder>>(folders =>
            folders.Count == 0));
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task ReorderAsync_WhenMovingToLastPosition_ShouldSetCorrectSortOrders()
    {
        var folderId = Guid.NewGuid();
        var fileA = CreateFile(folderId: folderId, name: "a.txt", sortOrder: 0);
        var fileB = CreateFile(folderId: folderId, name: "b.txt", sortOrder: 1);
        var subfolder = CreateFolder(parentFolderId: folderId, sortOrder: 2);

        ReturnsExistingFileForUpdate(fileA);
        fileRepository.GetByFolderAsync(folderId, currentUserId).Returns(Success<IReadOnlyList<File>>([fileA, fileB]));
        folderRepository.GetChildrenAsync(folderId, currentUserId)
            .Returns(Success<IReadOnlyList<Folder>>([subfolder]));

        var result = await sut.ReorderAsync(fileA.Id, 2);

        result.Status.Should().Be(ResultStatus.Ok);
        fileB.SortOrder.Should().Be(0);
        subfolder.SortOrder.Should().Be(1);
        fileA.SortOrder.Should().Be(2);
        await fileRepository.Received(1).UpdateRangeAsync(Arg.Is<IReadOnlyList<File>>(files =>
            files.Count == 2 &&
            files.Any(file => file.Id == fileB.Id && file.SortOrder == 0) &&
            files.Any(file => file.Id == fileA.Id && file.SortOrder == 2)));
        await folderRepository.Received(1).UpdateRangeAsync(Arg.Is<IReadOnlyList<Folder>>(folders =>
            folders.Count == 1 &&
            folders.Any(folder => folder.Id == subfolder.Id && folder.SortOrder == 1)));
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task ReorderAsync_WhenFileIsAtRoot_ShouldUseRootFoldersAsSiblings()
    {
        var fileA = CreateFile(name: "a.txt", sortOrder: 0, useRoot: true);
        var fileB = CreateFile(name: "b.txt", sortOrder: 1, useRoot: true);
        var rootFolder = CreateFolder(sortOrder: 2);

        ReturnsExistingFileForUpdate(fileA);
        fileRepository.GetByFolderAsync(null, currentUserId).Returns(Success<IReadOnlyList<File>>([fileA, fileB]));
        folderRepository.GetRootFoldersAsync(currentUserId).Returns(Success<IReadOnlyList<Folder>>([rootFolder]));

        var result = await sut.ReorderAsync(fileA.Id, 2);

        result.Status.Should().Be(ResultStatus.Ok);
        fileB.SortOrder.Should().Be(0);
        rootFolder.SortOrder.Should().Be(1);
        fileA.SortOrder.Should().Be(2);
        await fileRepository.Received(1).UpdateRangeAsync(Arg.Is<IReadOnlyList<File>>(files =>
            files.Count == 2 &&
            files.Any(file => file.Id == fileB.Id && file.SortOrder == 0) &&
            files.Any(file => file.Id == fileA.Id && file.SortOrder == 2)));
        await folderRepository.Received(1).UpdateRangeAsync(Arg.Is<IReadOnlyList<Folder>>(folders =>
            folders.Count == 1 &&
            folders.Any(folder => folder.Id == rootFolder.Id && folder.SortOrder == 1)));
        await folderRepository.DidNotReceive().GetChildrenAsync(Arg.Any<Guid?>(), Arg.Any<Guid>());
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task UpdateTextContentAsync_WhenFileDoesNotExist_ShouldReturnNotFound()
    {
        var fileId = Guid.NewGuid();

        var result = await sut.UpdateTextContentAsync(fileId, "new content");

        result.Status.Should().Be(ResultStatus.NotFound);
        await blobStorageService.DidNotReceive()
            .SaveAsync(Arg.Any<Stream>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task UpdateTextContentAsync_WhenFileIsNotText_ShouldReturnInvalid()
    {
        var file = CreateFile(contentType: "application/pdf");
        ReturnsExistingFileForUpdate(file);

        var result = await sut.UpdateTextContentAsync(file.Id, "new content");

        result.Status.Should().Be(ResultStatus.Invalid);
        await blobStorageService.DidNotReceive()
            .SaveAsync(Arg.Any<Stream>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task UpdateTextContentAsync_WhenRequestIsValid_ShouldSaveNewBlobAndUpdateSize()
    {
        var existingFile = CreateFile(contentType: "text/plain", sizeBytes: 5, version: 1);
        var originalBlobId = Guid.NewGuid();
        existingFile.BlobId = originalBlobId;
        const string newContent = "updated text content";
        var expectedBytes = Encoding.UTF8.GetBytes(newContent);
        byte[]? uploadedBytes = null;

        ReturnsExistingFileForUpdate(existingFile);
        blobStorageService
            .SaveAsync(Arg.Do<Stream>(stream =>
            {
                using var copy = new MemoryStream();
                stream.CopyTo(copy);
                uploadedBytes = copy.ToArray();
                stream.Position = 0;
            }), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Success());

        var result = await sut.UpdateTextContentAsync(existingFile.Id, newContent);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(existingFile);
        existingFile.ContentType.Should().Be("text/plain");
        existingFile.SizeBytes.Should().Be(expectedBytes.Length);
        existingFile.Version.Should().Be(2);
        existingFile.BlobId.Should().NotBe(originalBlobId);
        existingFile.BlobId.Should().NotBe(Guid.Empty);
        uploadedBytes.Should().Equal(expectedBytes);
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task UpdateTextContentAsync_WhenCommitSucceeds_ShouldDeletePreviousBlobBestEffort()
    {
        var existingFile = CreateFile(contentType: "text/plain", sizeBytes: 5, version: 1);
        var originalBlobId = Guid.NewGuid();
        existingFile.BlobId = originalBlobId;

        ReturnsExistingFileForUpdate(existingFile);
        blobStorageService.SaveAsync(Arg.Any<Stream>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Success());

        var result = await sut.UpdateTextContentAsync(existingFile.Id, "updated text content");

        result.Status.Should().Be(ResultStatus.Ok);
        await blobDeletionQueue.Received(1).EnqueueDeleteAsync(originalBlobId);
    }

    [Test]
    public async Task UpdateTextContentAsync_WhenBlobSaveFails_ShouldNotMutateTrackedFile()
    {
        var existingFile = CreateFile(contentType: "text/plain", sizeBytes: 5, version: 1);
        var originalBlobId = Guid.NewGuid();
        existingFile.BlobId = originalBlobId;

        ReturnsExistingFileForUpdate(existingFile);
        blobStorageService.SaveAsync(Arg.Any<Stream>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Error("storage error")));

        var result = await sut.UpdateTextContentAsync(existingFile.Id, "updated text content");

        result.Status.Should().Be(ResultStatus.Error);
        existingFile.ContentType.Should().Be("text/plain");
        existingFile.SizeBytes.Should().Be(5);
        existingFile.Version.Should().Be(1);
        existingFile.BlobId.Should().Be(originalBlobId);
        await unitOfWork.DidNotReceive().SaveChangesAsync();
        await blobDeletionQueue.DidNotReceive().EnqueueDeleteAsync(Arg.Any<Guid>());
    }

    private void ConfigureDefaults()
    {
        unitOfWork.SaveChangesAsync().Returns(Success());
        workspacePathService.ResolveFilePathAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<ResolvedFilePath>.NotFound(ResultErrorMessages.NotFound)));
        folderRepository.ExistsByIdAsync(Arg.Any<Guid>(), Arg.Any<Guid>()).Returns(Success(true));
        fileRepository.ExistsByNameInFolderAsync(Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<Guid>(), Arg.Any<Guid?>())
            .Returns(Success(false));
        fileRepository.AddAsync(Arg.Any<File>()).Returns(Success());
        fileRepository.DeleteAsync(Arg.Any<Guid>(), Arg.Any<Guid>()).Returns(Success());
        fileRepository.DeleteByFolderAsync(Arg.Any<Guid?>(), Arg.Any<Guid>()).Returns(Success<IReadOnlyList<File>>([]));
        fileRepository.UpdateRangeAsync(Arg.Any<IReadOnlyList<File>>()).Returns(Success());
        fileRepository.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<Guid>()).Returns(NotFound<File>());
        fileRepository.GetByIdForUpdateAsync(Arg.Any<Guid>(), Arg.Any<Guid>()).Returns(NotFound<File>());
        fileRepository.GetByFolderAsync(Arg.Any<Guid?>(), Arg.Any<Guid>()).Returns(Success<IReadOnlyList<File>>([]));
        fileRepository.ListByFolderAsync(Arg.Any<Guid?>(), Arg.Any<Guid>(), Arg.Any<int>(), Arg.Any<int>())
            .Returns(Success((Files: (IReadOnlyList<File>)Array.Empty<File>(), TotalCount: 0)));
        fileRepository.GetByFolderAndFileNameAsync(Arg.Any<Guid?>(), Arg.Any<Guid>(), Arg.Any<string>())
            .Returns(NotFound<File>());
        blobStorageService.SaveAsync(Arg.Any<Stream>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Success());
        blobDeletionQueue.EnqueueDeleteAsync(Arg.Any<Guid>()).Returns(ValueTask.CompletedTask);
        blobStorageService.GetAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(_ => Success<Stream>(new MemoryStream()));
        blobStorageService
            .GetRangeAsync(Arg.Any<Guid>(), Arg.Any<long>(), Arg.Any<long>(), Arg.Any<CancellationToken>())
            .Returns(_ => Success<Stream>(new MemoryStream()));
        folderRepository.GetChildrenAsync(Arg.Any<Guid?>(), Arg.Any<Guid>())
            .Returns(Success<IReadOnlyList<Folder>>([]));
        folderRepository.GetRootFoldersAsync(Arg.Any<Guid>())
            .Returns(Success<IReadOnlyList<Folder>>([]));
        folderRepository.UpdateRangeAsync(Arg.Any<IReadOnlyList<Folder>>()).Returns(Success());
    }

    private void ReturnsFolderExists(Guid? folderId, bool exists = true)
    {
        if (folderId is null)
            throw new ArgumentNullException(nameof(folderId));

        folderRepository.ExistsByIdAsync(folderId.Value, currentUserId).Returns(Success(exists));
    }

    private void ReturnsFileNameExists(string name, Guid? folderId, Guid fileId)
    {
        fileRepository.ExistsByNameInFolderAsync(name, folderId, currentUserId, fileId).Returns(Success(true));
    }

    private void ReturnsFileNameAvailable(string name, Guid? folderId, Guid fileId)
    {
        fileRepository.ExistsByNameInFolderAsync(name, folderId, currentUserId, fileId).Returns(Success(false));
    }

    private void ReturnsExistingFile(File file)
    {
        fileRepository.GetByIdAsync(file.Id, currentUserId).Returns(Success(file));
    }

    private void ReturnsExistingFileForUpdate(File file)
    {
        fileRepository.GetByIdForUpdateAsync(file.Id, currentUserId).Returns(Success(file));
    }

    private async Task AssertUploadDidNotPersistAsync()
    {
        await fileRepository.DidNotReceive().AddAsync(Arg.Any<File>());
        await blobStorageService.DidNotReceive()
            .SaveAsync(Arg.Any<Stream>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    private File CreateFile(
        Guid? fileId = null,
        Guid? folderId = null,
        string name = "file.txt",
        string description = "description",
        string contentType = "text/plain",
        long sizeBytes = 128,
        int version = 1,
        string? checksumSha256 = null,
        int sortOrder = 0,
        bool useRoot = false)
    {
        return new File(
            fileId ?? Guid.NewGuid(),
            userId: currentUserId,
            useRoot ? null : folderId ?? Guid.NewGuid(),
            name,
            description,
            contentType,
            sizeBytes,
            version,
            checksumSha256,
            sortOrder);
    }

    private static Folder CreateFolder(
        Guid? folderId = null,
        Guid? parentFolderId = null,
        int sortOrder = 0)
    {
        return new Folder(
            folderId ?? Guid.NewGuid(),
            Guid.NewGuid(),
            "folder",
            "description",
            parentFolderId,
            sortOrder);
    }

    private static MemoryStream CreateStream(string content)
    {
        return new MemoryStream(Encoding.UTF8.GetBytes(content));
    }

    private static Task<Result> Success()
    {
        return Task.FromResult(Result.Success());
    }

    private static Task<Result> Conflict()
    {
        return Task.FromResult(Result.Conflict(ResultErrorMessages.Conflict));
    }

    private static Task<Result<T>> Success<T>(T value)
    {
        return Task.FromResult(Result.Success(value));
    }

    private static Task<Result<T>> NotFound<T>()
    {
        return Task.FromResult(Result<T>.NotFound(ResultErrorMessages.NotFound));
    }
}
