using Ardalis.Result;
using AwesomeAssertions;
using NSubstitute;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Services;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Application.Tests.Services;

public class AttachmentServiceTests
{
    private IAttachmentRepository attachmentRepository = null!;
    private IBlobStorageService blobStorageService = null!;
    private IBlobDeletionQueue blobDeletionQueue = null!;
    private ICurrentUserService currentUserService = null!;
    private IUnitOfWork unitOfWork = null!;
    private Guid currentUserId;
    private AttachmentService sut = null!;

    [SetUp]
    public void SetUp()
    {
        attachmentRepository = Substitute.For<IAttachmentRepository>();
        blobStorageService = Substitute.For<IBlobStorageService>();
        blobDeletionQueue = Substitute.For<IBlobDeletionQueue>();
        currentUserService = Substitute.For<ICurrentUserService>();
        unitOfWork = Substitute.For<IUnitOfWork>();
        currentUserId = Guid.NewGuid();

        currentUserService.UserId.Returns(currentUserId);
        unitOfWork.SaveChangesAsync().Returns(Task.FromResult(Result.Success()));
        blobStorageService.SaveAsync(Arg.Any<Stream>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Success());
        blobDeletionQueue.EnqueueDeleteAsync(Arg.Any<Guid>()).Returns(ValueTask.CompletedTask);

        sut = new AttachmentService(
            attachmentRepository, blobStorageService, blobDeletionQueue, currentUserService, unitOfWork);
    }

    [Test]
    public async Task UploadAsync_WhenRequestIsValid_ShouldPersistMetadataAndBlobs()
    {
        var first = CreateAttachment();
        var second = CreateAttachment();
        using var stream1 = new MemoryStream([1, 2, 3]);
        using var stream2 = new MemoryStream([4, 5]);
        (ChatAttachment Attachment, Stream Content)[] uploads = [(first, stream1), (second, stream2)];
        IReadOnlyCollection<ChatAttachment> attachments = [first, second];

        attachmentRepository.AddRangeAsync(Arg.Is<IReadOnlyCollection<ChatAttachment>>(items =>
                items.Count == 2 && items.Contains(first) && items.Contains(second)))
            .Returns(Success());

        var result = await sut.UploadAsync(uploads);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().HaveCount(2);
        result.Value.Should().Contain(first);
        result.Value.Should().Contain(second);
        first.BlobId.Should().NotBe(Guid.Empty);
        second.BlobId.Should().NotBe(Guid.Empty);
        await attachmentRepository.Received(1).AddRangeAsync(
            Arg.Is<IReadOnlyCollection<ChatAttachment>>(items =>
                items.Count == 2 && items.Contains(first) && items.Contains(second)));
        await blobStorageService.Received(1).SaveAsync(stream1, first.BlobId, Arg.Any<CancellationToken>());
        await blobStorageService.Received(1).SaveAsync(stream2, second.BlobId, Arg.Any<CancellationToken>());
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task UploadAsync_WhenAddRangeFails_ShouldReturnFailureWithoutSaving()
    {
        var attachment = CreateAttachment();
        using var stream = new MemoryStream([1]);

        attachmentRepository.AddRangeAsync(Arg.Any<IReadOnlyCollection<ChatAttachment>>())
            .Returns(Task.FromResult(Result.Error("db error")));

        var result = await sut.UploadAsync([(attachment, (Stream)stream)]);

        result.Status.Should().Be(ResultStatus.Error);
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task UploadAsync_WhenBlobSaveFails_ShouldReturnFailureWithoutSaving()
    {
        var attachment = CreateAttachment();
        using var stream = new MemoryStream([1]);

        blobStorageService.SaveAsync(Arg.Any<Stream>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Error("storage error")));

        var result = await sut.UploadAsync([(attachment, (Stream)stream)]);

        result.Status.Should().Be(ResultStatus.Error);
        await attachmentRepository.DidNotReceive()
            .AddRangeAsync(Arg.Any<IReadOnlyCollection<ChatAttachment>>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task GetByIdAsync_WhenCalled_ShouldReturnRepositoryResultForCurrentUser()
    {
        var attachment = CreateAttachment();

        attachmentRepository.GetByIdAsync(attachment.Id, currentUserId)
            .Returns(Task.FromResult(Result.Success(attachment)));

        var result = await sut.GetByIdAsync(attachment.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(attachment);
        await attachmentRepository.Received(1).GetByIdAsync(attachment.Id, currentUserId);
    }

    [Test]
    public async Task GetByIdAsync_WhenRepositoryReturnsNotFound_ShouldReturnNotFound()
    {
        var attachmentId = Guid.NewGuid();
        attachmentRepository.GetByIdAsync(attachmentId, currentUserId)
            .Returns(Task.FromResult(Result<ChatAttachment>.NotFound()));

        var result = await sut.GetByIdAsync(attachmentId);

        result.Status.Should().Be(ResultStatus.NotFound);
    }

    [Test]
    public async Task GetByIdsAsync_WhenCalled_ShouldReturnRepositoryResultForCurrentUser()
    {
        var attachment = CreateAttachment();
        IReadOnlyList<ChatAttachment> list = [attachment];
        var ids = new[] { attachment.Id };

        attachmentRepository.GetByIdsAsync(ids, currentUserId)
            .Returns(Task.FromResult(Result.Success(list)));

        var result = await sut.GetByIdsAsync(ids);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeSameAs(list);
        await attachmentRepository.Received(1).GetByIdsAsync(ids, currentUserId);
    }

    [Test]
    public async Task GetByIdsAsync_WhenRepositoryReturnsNotFound_ShouldReturnNotFound()
    {
        var ids = new[] { Guid.NewGuid() };
        attachmentRepository.GetByIdsAsync(ids, currentUserId)
            .Returns(Task.FromResult(Result<IReadOnlyList<ChatAttachment>>.NotFound()));

        var result = await sut.GetByIdsAsync(ids);

        result.Status.Should().Be(ResultStatus.NotFound);
    }

    [Test]
    public async Task MarkConsumedAsync_WhenCalled_ShouldMarkAndSaveChanges()
    {
        var ids = new[] { Guid.NewGuid(), Guid.NewGuid() };
        attachmentRepository.MarkConsumedAsync(ids).Returns(Success());

        var result = await sut.MarkConsumedAsync(ids);

        result.Status.Should().Be(ResultStatus.Ok);
        await attachmentRepository.Received(1).MarkConsumedAsync(ids);
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task MarkConsumedAsync_WhenRepositoryFails_ShouldReturnFailureWithoutSaving()
    {
        var ids = new[] { Guid.NewGuid() };
        attachmentRepository.MarkConsumedAsync(ids)
            .Returns(Task.FromResult(Result.Error("not found")));

        var result = await sut.MarkConsumedAsync(ids);

        result.Status.Should().Be(ResultStatus.Error);
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task PurgeExpiredAsync_WhenNoExpiredAttachments_ShouldReturnEmptyListWithoutDeleting()
    {
        IReadOnlyList<ChatAttachment> empty = [];
        attachmentRepository.GetExpiredUnconsumedAsync(Arg.Any<DateTimeOffset>())
            .Returns(Task.FromResult(Result.Success(empty)));

        var result = await sut.PurgeExpiredAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeEmpty();
        await blobDeletionQueue.DidNotReceive().EnqueueDeleteAsync(Arg.Any<Guid>());
        await attachmentRepository.DidNotReceive().DeleteRangeAsync(Arg.Any<IReadOnlyCollection<Guid>>());
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task PurgeExpiredAsync_WhenExpiredExist_ShouldDeleteRecordsThenSave()
    {
        var expired1 = CreateAttachment();
        expired1.SetBlobId(Guid.NewGuid());
        var expired2 = CreateAttachment();
        expired2.SetBlobId(Guid.NewGuid());
        IReadOnlyList<ChatAttachment> expired = [expired1, expired2];

        attachmentRepository.GetExpiredUnconsumedAsync(Arg.Any<DateTimeOffset>())
            .Returns(Task.FromResult(Result.Success(expired)));
        attachmentRepository.DeleteRangeAsync(Arg.Any<IReadOnlyCollection<Guid>>()).Returns(Success());

        var result = await sut.PurgeExpiredAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().HaveCount(2);
        await attachmentRepository.Received(1).DeleteRangeAsync(
            Arg.Is<IReadOnlyCollection<Guid>>(ids =>
                ids.Contains(expired1.Id) && ids.Contains(expired2.Id)));
        await unitOfWork.Received(1).SaveChangesAsync();
        await blobDeletionQueue.Received(1).EnqueueDeleteAsync(expired1.BlobId);
        await blobDeletionQueue.Received(1).EnqueueDeleteAsync(expired2.BlobId);
    }

    [Test]
    public async Task PurgeExpiredAsync_WhenDeleteRangeFails_ShouldReturnFailureWithoutSaving()
    {
        var expired = CreateAttachment();
        expired.SetBlobId(Guid.NewGuid());
        IReadOnlyList<ChatAttachment> expiredList = [expired];

        attachmentRepository.GetExpiredUnconsumedAsync(Arg.Any<DateTimeOffset>())
            .Returns(Task.FromResult(Result.Success(expiredList)));
        attachmentRepository.DeleteRangeAsync(Arg.Any<IReadOnlyCollection<Guid>>())
            .Returns(Task.FromResult(Result.Error("db error")));

        var result = await sut.PurgeExpiredAsync();

        result.Status.Should().Be(ResultStatus.Error);
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task PurgeExpiredAsync_ShouldUseCutoffOfOneHourAgo()
    {
        var before = DateTimeOffset.UtcNow;
        IReadOnlyList<ChatAttachment> empty = [];
        DateTimeOffset capturedCutoff = default;

        attachmentRepository.GetExpiredUnconsumedAsync(Arg.Do<DateTimeOffset>(d => capturedCutoff = d))
            .Returns(Task.FromResult(Result.Success(empty)));

        await sut.PurgeExpiredAsync();

        var after = DateTimeOffset.UtcNow;
        var expectedLower = before - TimeSpan.FromHours(1);
        var expectedUpper = after - TimeSpan.FromHours(1);
        capturedCutoff.Should().BeOnOrAfter(expectedLower);
        capturedCutoff.Should().BeOnOrBefore(expectedUpper);
    }

    private ChatAttachment CreateAttachment(
        Guid? attachmentId = null,
        Guid? userId = null,
        string fileName = "file.txt",
        string contentType = "text/plain",
        long sizeBytes = 128)
    {
        return new ChatAttachment(
            attachmentId ?? Guid.NewGuid(),
            userId ?? currentUserId,
            Guid.NewGuid(),
            fileName,
            contentType,
            sizeBytes);
    }

    private static Task<Result> Success()
    {
        return Task.FromResult(Result.Success());
    }
}
