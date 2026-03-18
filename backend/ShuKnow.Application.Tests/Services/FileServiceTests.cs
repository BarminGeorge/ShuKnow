using System.Text;
using Ardalis.Result;
using AwesomeAssertions;
using NSubstitute;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Services;
using ShuKnow.Domain.Repositories;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Tests.Services;

public class FileServiceTests
{
    private IFileRepository fileRepository = null!;
    private IFolderRepository folderRepository = null!;
    private IBlobStorageService blobStorageService = null!;
    private ICurrentUserService currentUserService = null!;
    private IUnitOfWork unitOfWork = null!;
    private Guid currentUserId;
    private FileService sut = null!;

    [SetUp]
    public void SetUp()
    {
        fileRepository = Substitute.For<IFileRepository>();
        folderRepository = Substitute.For<IFolderRepository>();
        blobStorageService = Substitute.For<IBlobStorageService>();
        currentUserService = Substitute.For<ICurrentUserService>();
        unitOfWork = Substitute.For<IUnitOfWork>();
        currentUserId = Guid.NewGuid();

        currentUserService.UserId.Returns(currentUserId);
        ConfigureDefaults();

        sut = new FileService(
            fileRepository,
            folderRepository,
            blobStorageService,
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
        blobStorageService.SaveAsync(content, file, Arg.Any<CancellationToken>()).Returns(Success());

        var result = await sut.UploadAsync(file, content);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(file);
        await fileRepository.Received(1).AddAsync(file);
        await blobStorageService.Received(1).SaveAsync(content, file, Arg.Any<CancellationToken>());
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
    public async Task DeleteAsync_WhenFileExists_ShouldDeleteMetadataAndBlob()
    {
        var file = CreateFile();
        ReturnsExistingFile(file);
        fileRepository.DeleteAsync(file.Id).Returns(Success());
        blobStorageService.DeleteAsync(file.Id, Arg.Any<CancellationToken>()).Returns(Success());

        var result = await sut.DeleteAsync(file.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        await fileRepository.Received(1).DeleteAsync(file.Id);
        await blobStorageService.Received(1).DeleteAsync(file.Id, Arg.Any<CancellationToken>());
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task GetContentAsync_WhenNoRangeIsRequested_ShouldReturnFullContent()
    {
        var file = CreateFile(sizeBytes: 12, contentType: "text/plain");
        using var stream = CreateStream("full content");
        ReturnsExistingFile(file);
        blobStorageService.GetAsync(file.Id, Arg.Any<CancellationToken>()).Returns(Success<Stream>(stream));

        var result = await sut.GetContentAsync(file.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Content.Should().BeSameAs(stream);
        result.Value.ContentType.Should().Be(file.ContentType);
        result.Value.SizeBytes.Should().Be(file.SizeBytes);
        await blobStorageService.Received(1).GetAsync(file.Id, Arg.Any<CancellationToken>());
        await blobStorageService.DidNotReceive()
            .GetRangeAsync(Arg.Any<Guid>(), Arg.Any<long>(), Arg.Any<long>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task GetContentAsync_WhenPartialRangeIsRequested_ShouldRequestBlobRange()
    {
        var file = CreateFile(sizeBytes: 512, contentType: "application/pdf");
        using var stream = CreateStream("range");
        const long rangeStart = 128;

        ReturnsExistingFile(file);
        blobStorageService.GetRangeAsync(file.Id, rangeStart, file.SizeBytes, Arg.Any<CancellationToken>())
            .Returns(Success<Stream>(stream));

        var result = await sut.GetContentAsync(file.Id, rangeStart);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Content.Should().BeSameAs(stream);
        await blobStorageService.Received(1)
            .GetRangeAsync(file.Id, rangeStart, file.SizeBytes, Arg.Any<CancellationToken>());
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
            .ReplaceAsync(Arg.Any<Stream>(), Arg.Any<File>(), Arg.Any<CancellationToken>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task ReplaceContentAsync_WhenRequestIsValid_ShouldReplaceBlobAndUpdateFileMetadata()
    {
        var existingFile = CreateFile(contentType: "text/plain", sizeBytes: 3, version: 2);
        using var content = CreateStream("updated payload");
        var expectedBytes = "updated payload"u8.ToArray();
        byte[]? uploadedBytes = null;
        long? uploadedPosition = null;

        ReturnsExistingFileForUpdate(existingFile);
        blobStorageService
            .ReplaceAsync(Arg.Do<Stream>(stream =>
            {
                uploadedPosition = stream.Position;
                using var copy = new MemoryStream();
                stream.CopyTo(copy);
                uploadedBytes = copy.ToArray();
                stream.Position = 0;
            }), existingFile, Arg.Any<CancellationToken>())
            .Returns(Success());

        var result = await sut.ReplaceContentAsync(existingFile.Id, content, "application/json");

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(existingFile);
        existingFile.ContentType.Should().Be("application/json");
        existingFile.SizeBytes.Should().Be(expectedBytes.Length);
        existingFile.Version.Should().Be(3);
        uploadedPosition.Should().Be(0);
        uploadedBytes.Should().Equal(expectedBytes);
        await unitOfWork.Received(1).SaveChangesAsync();
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
        file.FolderId.Should().NotBe(originalFolderId);
        file.Version.Should().Be(5);
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task DeleteByFolderAsync_WhenBlobDeletionFails_ShouldReturnFailureWithoutSavingChanges()
    {
        var folderId = Guid.NewGuid();
        var firstFile = CreateFile(folderId: folderId);
        var secondFile = CreateFile(folderId: folderId);

        ReturnsFolderExists(folderId);
        fileRepository.DeleteByFolderAsync(folderId)
            .Returns(Success<IReadOnlyList<File>>([firstFile, secondFile]));
        blobStorageService.DeleteAsync(firstFile.Id, Arg.Any<CancellationToken>()).Returns(Success());
        blobStorageService.DeleteAsync(secondFile.Id, Arg.Any<CancellationToken>()).Returns(Conflict());

        var result = await sut.DeleteByFolderAsync(folderId);

        result.Status.Should().Be(ResultStatus.Conflict);
        await blobStorageService.Received(1).DeleteAsync(firstFile.Id, Arg.Any<CancellationToken>());
        await blobStorageService.Received(1).DeleteAsync(secondFile.Id, Arg.Any<CancellationToken>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task DeleteByFolderAsync_WhenAllBlobDeletesSucceed_ShouldDeleteAllBlobsAndSaveChanges()
    {
        var folderId = Guid.NewGuid();
        var firstFile = CreateFile(folderId: folderId);
        var secondFile = CreateFile(folderId: folderId);

        ReturnsFolderExists(folderId);
        fileRepository.DeleteByFolderAsync(folderId)
            .Returns(Success<IReadOnlyList<File>>([firstFile, secondFile]));
        blobStorageService.DeleteAsync(firstFile.Id, Arg.Any<CancellationToken>()).Returns(Success());
        blobStorageService.DeleteAsync(secondFile.Id, Arg.Any<CancellationToken>()).Returns(Success());

        var result = await sut.DeleteByFolderAsync(folderId);

        result.Status.Should().Be(ResultStatus.Ok);
        await blobStorageService.Received(1).DeleteAsync(firstFile.Id, Arg.Any<CancellationToken>());
        await blobStorageService.Received(1).DeleteAsync(secondFile.Id, Arg.Any<CancellationToken>());
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    private void ConfigureDefaults()
    {
        unitOfWork.SaveChangesAsync().Returns(Success());
        folderRepository.ExistsByIdAsync(Arg.Any<Guid>(), Arg.Any<Guid>()).Returns(Success(true));
        fileRepository.ExistsByNameInFolderAsync(Arg.Any<string>(), Arg.Any<Guid>(), Arg.Any<Guid>(), Arg.Any<Guid?>())
            .Returns(Success(false));
        fileRepository.AddAsync(Arg.Any<File>()).Returns(Success());
        fileRepository.DeleteAsync(Arg.Any<Guid>()).Returns(Success());
        fileRepository.DeleteByFolderAsync(Arg.Any<Guid>()).Returns(Success<IReadOnlyList<File>>([]));
        fileRepository.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<Guid>()).Returns(NotFound<File>());
        fileRepository.GetByIdForUpdateAsync(Arg.Any<Guid>(), Arg.Any<Guid>()).Returns(NotFound<File>());
        blobStorageService.SaveAsync(Arg.Any<Stream>(), Arg.Any<File>(), Arg.Any<CancellationToken>())
            .Returns(Success());
        blobStorageService.ReplaceAsync(Arg.Any<Stream>(), Arg.Any<File>(), Arg.Any<CancellationToken>())
            .Returns(Success());
        blobStorageService.DeleteAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(Success());
        blobStorageService.GetAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(_ => Success<Stream>(new MemoryStream()));
        blobStorageService
            .GetRangeAsync(Arg.Any<Guid>(), Arg.Any<long>(), Arg.Any<long>(), Arg.Any<CancellationToken>())
            .Returns(_ => Success<Stream>(new MemoryStream()));
    }

    private void ReturnsFolderExists(Guid folderId, bool exists = true)
    {
        folderRepository.ExistsByIdAsync(folderId, currentUserId).Returns(Success(exists));
    }

    private void ReturnsFileNameExists(string name, Guid folderId, Guid fileId)
    {
        fileRepository.ExistsByNameInFolderAsync(name, folderId, currentUserId, fileId).Returns(Success(true));
    }

    private void ReturnsFileNameAvailable(string name, Guid folderId, Guid fileId)
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
            .SaveAsync(Arg.Any<Stream>(), Arg.Any<File>(), Arg.Any<CancellationToken>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    private static File CreateFile(
        Guid? fileId = null,
        Guid? folderId = null,
        string name = "file.txt",
        string description = "description",
        string contentType = "text/plain",
        long sizeBytes = 128,
        int version = 1,
        string? checksumSha256 = null)
    {
        return new File(
            fileId ?? Guid.NewGuid(),
            folderId ?? Guid.NewGuid(),
            name,
            description,
            contentType,
            sizeBytes,
            version,
            checksumSha256);
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
        return Task.FromResult(Result.Conflict());
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