using System.Text;
using Ardalis.Result;
using AwesomeAssertions;
using NSubstitute;
using ShuKnow.Infrastructure.Services;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Tests.Services;

public class BlobStorageServiceTests
{
    private string storageRootPath = null!;
    private BlobStorageService sut = null!;

    [SetUp]
    public void SetUp()
    {
        storageRootPath = Path.Combine(Path.GetTempPath(), "shuknow-blob-tests", Guid.NewGuid().ToString("N"));

        var configuration = Substitute.For<Microsoft.Extensions.Configuration.IConfiguration>();
        configuration["BlobStorage:RootPath"].Returns(storageRootPath);

        sut = new BlobStorageService(configuration);
    }

    [TearDown]
    public void TearDown()
    {
        if (Directory.Exists(storageRootPath))
            Directory.Delete(storageRootPath, recursive: true);
    }

    [Test]
    public async Task SaveAsync_WhenBlobDoesNotExist_ShouldPersistContentAndReturnSuccess()
    {
        var file = CreateFile();
        await using var content = CreateStream("hello blob");

        var result = await sut.SaveAsync(content, file);

        result.IsSuccess.Should().BeTrue();
        var storedPath = GetBlobPath(file.Id);
        System.IO.File.Exists(storedPath).Should().BeTrue();
        var storedContent = await System.IO.File.ReadAllTextAsync(storedPath);
        storedContent.Should().Be("hello blob");
    }

    [Test]
    public async Task SaveAsync_WhenBlobAlreadyExists_ShouldReturnConflictWithoutOverwriting()
    {
        var file = CreateFile();
        await using var initial = CreateStream("first");
        await sut.SaveAsync(initial, file);

        await using var second = CreateStream("second");
        var result = await sut.SaveAsync(second, file);

        result.Status.Should().Be(ResultStatus.Conflict);
        var storedContent = await System.IO.File.ReadAllTextAsync(GetBlobPath(file.Id));
        storedContent.Should().Be("first");
    }

    [Test]
    public async Task GetAsync_WhenBlobExists_ShouldReturnStoredStream()
    {
        var file = CreateFile();
        await using var content = CreateStream("read me");
        await sut.SaveAsync(content, file);

        var result = await sut.GetAsync(file.Id);

        result.IsSuccess.Should().BeTrue();
        using var reader = new StreamReader(result.Value, Encoding.UTF8, leaveOpen: true);
        var text = await reader.ReadToEndAsync();
        text.Should().Be("read me");
    }

    [Test]
    public async Task GetRangeAsync_WhenRangeIsValid_ShouldReturnRequestedBytes()
    {
        var file = CreateFile();
        await using var content = CreateStream("0123456789");
        await sut.SaveAsync(content, file);

        var result = await sut.GetRangeAsync(file.Id, 2, 6);

        result.IsSuccess.Should().BeTrue();
        using var reader = new StreamReader(result.Value, Encoding.UTF8, leaveOpen: true);
        var text = await reader.ReadToEndAsync();
        text.Should().Be("2345");
    }

    [Test]
    public async Task ReplaceAsync_WhenBlobExists_ShouldOverwriteContent()
    {
        var file = CreateFile();
        await using var initial = CreateStream("before");
        await sut.SaveAsync(initial, file);

        await using var replacement = CreateStream("after");
        var replaceResult = await sut.ReplaceAsync(replacement, file);

        replaceResult.IsSuccess.Should().BeTrue();
        var getResult = await sut.GetAsync(file.Id);
        using var reader = new StreamReader(getResult.Value, Encoding.UTF8, leaveOpen: true);
        var text = await reader.ReadToEndAsync();
        text.Should().Be("after");
    }

    [Test]
    public async Task ReplaceAsync_WhenBlobDoesNotExist_ShouldReturnNotFound()
    {
        var file = CreateFile();
        await using var replacement = CreateStream("after");

        var replaceResult = await sut.ReplaceAsync(replacement, file);

        replaceResult.Status.Should().Be(ResultStatus.NotFound);
    }

    [Test]
    public async Task DeleteAsync_WhenBlobExists_ShouldRemoveBlob()
    {
        var file = CreateFile();
        await using var content = CreateStream("to delete");
        await sut.SaveAsync(content, file);

        var deleteResult = await sut.DeleteAsync(file.Id);

        deleteResult.IsSuccess.Should().BeTrue();
        System.IO.File.Exists(GetBlobPath(file.Id)).Should().BeFalse();
    }

    [Test]
    public async Task GetSizeAsync_WhenBlobExists_ShouldReturnBlobLength()
    {
        var file = CreateFile();
        await using var content = CreateStream("12345");
        await sut.SaveAsync(content, file);

        var sizeResult = await sut.GetSizeAsync(file.Id);

        sizeResult.IsSuccess.Should().BeTrue();
        sizeResult.Value.Should().Be(5);
    }

    [Test]
    public async Task GetSizeAsync_WhenBlobDoesNotExist_ShouldReturnNotFound()
    {
        var result = await sut.GetSizeAsync(Guid.NewGuid());

        result.Status.Should().Be(ResultStatus.NotFound);
    }

    private string GetBlobPath(Guid fileId)
    {
        return Path.Combine(storageRootPath, $"{fileId:N}.blob");
    }

    private static File CreateFile()
    {
        return new File(
            fileId: Guid.NewGuid(),
            folderId: Guid.NewGuid(),
            name: "test.txt",
            description: "description",
            contentType: "text/plain",
            sizeBytes: 0);
    }

    private static MemoryStream CreateStream(string content)
    {
        return new MemoryStream(Encoding.UTF8.GetBytes(content));
    }
}
