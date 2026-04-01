using Ardalis.Result;
using AwesomeAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NSubstitute;
using ShuKnow.Application.Common;
using ShuKnow.Domain.Repositories;
using ShuKnow.Infrastructure.Interfaces;
using ShuKnow.Infrastructure.Services;

namespace ShuKnow.Infrastructure.Tests.Services;

public class BlobOrphanCleanupRunnerTests
{
    private IBlobStorageProvider provider = null!;
    private IFileRepository fileRepository = null!;
    private IAttachmentRepository attachmentRepository = null!;
    private IOptions<OrphanCleanupOptions> options = null!;
    private ILogger<BlobOrphanCleanupRunner> logger = null!;
    private BlobOrphanCleanupRunner sut = null!;

    [SetUp]
    public void SetUp()
    {
        provider = Substitute.For<IBlobStorageProvider>();
        fileRepository = Substitute.For<IFileRepository>();
        attachmentRepository = Substitute.For<IAttachmentRepository>();
        logger = Substitute.For<ILogger<BlobOrphanCleanupRunner>>();
        options = Options.Create(new OrphanCleanupOptions
        {
            IntervalHours = 6,
            GracePeriodMinutes = 60
        });

        sut = new BlobOrphanCleanupRunner(
            provider,
            fileRepository,
            attachmentRepository,
            options,
            logger);
    }

    [Test]
    public async Task RunCleanupAsync_WhenNoBlobsExist_ShouldReturnZeroAndNotDelete()
    {
        provider.StreamWithTimestampsAsync(Arg.Any<CancellationToken>())
            .Returns(StreamTimestamps([]));

        var deleted = await sut.RunCleanupAsync(CancellationToken.None);

        deleted.Should().Be(0);
        await provider.DidNotReceive().DeleteAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task RunCleanupAsync_WhenAllBlobsAreReferenced_ShouldReturnZero()
    {
        var blobId1 = Guid.NewGuid();
        var blobId2 = Guid.NewGuid();
        var oldTimestamp = DateTimeOffset.UtcNow.AddHours(-2);

        provider.StreamWithTimestampsAsync(Arg.Any<CancellationToken>())
            .Returns(StreamTimestamps([(blobId1, oldTimestamp), (blobId2, oldTimestamp)]));
        fileRepository.GetExistingBlobIdsAsync(
                Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Contains(blobId1) && ids.Contains(blobId2)),
                Arg.Any<CancellationToken>())
            .Returns(SuccessBlobIds(blobId1));
        attachmentRepository.GetExistingBlobIdsAsync(
                Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Contains(blobId1) && ids.Contains(blobId2)),
                Arg.Any<CancellationToken>())
            .Returns(SuccessBlobIds(blobId2));

        var deleted = await sut.RunCleanupAsync(CancellationToken.None);

        deleted.Should().Be(0);
        await provider.DidNotReceive().DeleteAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task RunCleanupAsync_WhenOrphansExistPastGracePeriod_ShouldDeleteThem()
    {
        var referencedId = Guid.NewGuid();
        var orphanId = Guid.NewGuid();
        var oldTimestamp = DateTimeOffset.UtcNow.AddHours(-2);

        provider.StreamWithTimestampsAsync(Arg.Any<CancellationToken>())
            .Returns(StreamTimestamps([(referencedId, oldTimestamp), (orphanId, oldTimestamp)]));
        fileRepository.GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(call => SuccessBlobIds(call.ArgAt<IReadOnlyCollection<Guid>>(0).Contains(referencedId)
                ? [referencedId]
                : []));
        attachmentRepository.GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(SuccessBlobIds());
        provider.DeleteAsync(orphanId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success()));

        var deleted = await sut.RunCleanupAsync(CancellationToken.None);

        deleted.Should().Be(1);
        await provider.Received(1).DeleteAsync(orphanId, Arg.Any<CancellationToken>());
        await provider.DidNotReceive().DeleteAsync(referencedId, Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task RunCleanupAsync_WhenOrphanIsWithinGracePeriod_ShouldNotDeleteIt()
    {
        var orphanId = Guid.NewGuid();
        var recentTimestamp = DateTimeOffset.UtcNow.AddMinutes(-30);

        provider.StreamWithTimestampsAsync(Arg.Any<CancellationToken>())
            .Returns(StreamTimestamps([(orphanId, recentTimestamp)]));

        var deleted = await sut.RunCleanupAsync(CancellationToken.None);

        deleted.Should().Be(0);
        await provider.DidNotReceive().DeleteAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await fileRepository.DidNotReceive()
            .GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
        await attachmentRepository.DidNotReceive()
            .GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task RunCleanupAsync_WhenMultipleOrphansExist_ShouldDeleteAllPastGracePeriod()
    {
        var orphan1 = Guid.NewGuid();
        var orphan2 = Guid.NewGuid();
        var recentOrphan = Guid.NewGuid();
        var referencedId = Guid.NewGuid();
        var oldTimestamp = DateTimeOffset.UtcNow.AddHours(-3);
        var recentTimestamp = DateTimeOffset.UtcNow.AddMinutes(-10);

        provider.StreamWithTimestampsAsync(Arg.Any<CancellationToken>())
            .Returns(StreamTimestamps([
                (orphan1, oldTimestamp),
                (orphan2, oldTimestamp),
                (recentOrphan, recentTimestamp),
                (referencedId, oldTimestamp)
            ]));
        fileRepository.GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(call => SuccessBlobIds(call.ArgAt<IReadOnlyCollection<Guid>>(0).Contains(referencedId)
                ? [referencedId]
                : []));
        attachmentRepository.GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(SuccessBlobIds());
        provider.DeleteAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success()));

        var deleted = await sut.RunCleanupAsync(CancellationToken.None);

        deleted.Should().Be(2);
        await provider.Received(1).DeleteAsync(orphan1, Arg.Any<CancellationToken>());
        await provider.Received(1).DeleteAsync(orphan2, Arg.Any<CancellationToken>());
        await provider.DidNotReceive().DeleteAsync(recentOrphan, Arg.Any<CancellationToken>());
        await provider.DidNotReceive().DeleteAsync(referencedId, Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task RunCleanupAsync_WhenListBlobsFails_ShouldReturnZeroAndNotQueryDb()
    {
        provider.StreamWithTimestampsAsync(Arg.Any<CancellationToken>())
            .Returns(_ => ThrowOnEnumeration<(Guid BlobId, DateTimeOffset CreatedAt)>(new InvalidOperationException("storage error")));

        var deleted = await sut.RunCleanupAsync(CancellationToken.None);

        deleted.Should().Be(0);
        await fileRepository.DidNotReceive()
            .GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
        await attachmentRepository.DidNotReceive()
            .GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task RunCleanupAsync_WhenFileRepoFails_ShouldReturnZeroAndNotDelete()
    {
        var orphanId = Guid.NewGuid();
        var oldTimestamp = DateTimeOffset.UtcNow.AddHours(-2);

        provider.StreamWithTimestampsAsync(Arg.Any<CancellationToken>())
            .Returns(StreamTimestamps([(orphanId, oldTimestamp)]));
        fileRepository.GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<IReadOnlySet<Guid>>.Error("db error")));
        attachmentRepository.GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(SuccessBlobIds());

        var deleted = await sut.RunCleanupAsync(CancellationToken.None);

        deleted.Should().Be(0);
        await provider.DidNotReceive().DeleteAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task RunCleanupAsync_WhenAttachmentRepoFails_ShouldReturnZeroAndNotDelete()
    {
        var orphanId = Guid.NewGuid();
        var oldTimestamp = DateTimeOffset.UtcNow.AddHours(-2);

        provider.StreamWithTimestampsAsync(Arg.Any<CancellationToken>())
            .Returns(StreamTimestamps([(orphanId, oldTimestamp)]));
        fileRepository.GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(SuccessBlobIds());
        attachmentRepository.GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result<IReadOnlySet<Guid>>.Error("db error")));

        var deleted = await sut.RunCleanupAsync(CancellationToken.None);

        deleted.Should().Be(0);
        await provider.DidNotReceive().DeleteAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task RunCleanupAsync_WhenDeleteFails_ShouldContinueAndCountOnlySuccessful()
    {
        var orphan1 = Guid.NewGuid();
        var orphan2 = Guid.NewGuid();
        var oldTimestamp = DateTimeOffset.UtcNow.AddHours(-2);

        provider.StreamWithTimestampsAsync(Arg.Any<CancellationToken>())
            .Returns(StreamTimestamps([(orphan1, oldTimestamp), (orphan2, oldTimestamp)]));
        fileRepository.GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(SuccessBlobIds());
        attachmentRepository.GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(SuccessBlobIds());
        provider.DeleteAsync(orphan1, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Error("delete failed")));
        provider.DeleteAsync(orphan2, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success()));

        var deleted = await sut.RunCleanupAsync(CancellationToken.None);

        deleted.Should().Be(1);
        await provider.Received(1).DeleteAsync(orphan1, Arg.Any<CancellationToken>());
        await provider.Received(1).DeleteAsync(orphan2, Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task RunCleanupAsync_WhenBlobReferencedByBothRepos_ShouldNotDeleteIt()
    {
        var sharedBlobId = Guid.NewGuid();
        var oldTimestamp = DateTimeOffset.UtcNow.AddHours(-2);

        provider.StreamWithTimestampsAsync(Arg.Any<CancellationToken>())
            .Returns(StreamTimestamps([(sharedBlobId, oldTimestamp)]));
        fileRepository.GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(SuccessBlobIds(sharedBlobId));
        attachmentRepository.GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(SuccessBlobIds(sharedBlobId));

        var deleted = await sut.RunCleanupAsync(CancellationToken.None);

        deleted.Should().Be(0);
        await provider.DidNotReceive().DeleteAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task RunCleanupAsync_ShouldUseConfiguredGracePeriod()
    {
        var customOptions = Options.Create(new OrphanCleanupOptions
        {
            IntervalHours = 1,
            GracePeriodMinutes = 120
        });
        var customSut = new BlobOrphanCleanupRunner(
            provider,
            fileRepository,
            attachmentRepository,
            customOptions,
            logger);

        var orphanId = Guid.NewGuid();
        var timestamp = DateTimeOffset.UtcNow.AddMinutes(-90);

        provider.StreamWithTimestampsAsync(Arg.Any<CancellationToken>())
            .Returns(StreamTimestamps([(orphanId, timestamp)]));
        fileRepository.GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(SuccessBlobIds());
        attachmentRepository.GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(SuccessBlobIds());

        var deleted = await customSut.RunCleanupAsync(CancellationToken.None);

        deleted.Should().Be(0);
        await provider.DidNotReceive().DeleteAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task RunCleanupAsync_ShouldPassCancellationTokenToBlobIdQueries()
    {
        using var cts = new CancellationTokenSource();
        var token = cts.Token;
        var orphanId = Guid.NewGuid();
        var oldTimestamp = DateTimeOffset.UtcNow.AddHours(-2);

        provider.StreamWithTimestampsAsync(token)
            .Returns(StreamTimestamps([(orphanId, oldTimestamp)]));
        fileRepository.GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), token)
            .Returns(SuccessBlobIds());
        attachmentRepository.GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), token)
            .Returns(SuccessBlobIds());
        provider.DeleteAsync(orphanId, token)
            .Returns(Task.FromResult(Result.Success()));

        var deleted = await sut.RunCleanupAsync(token);

        deleted.Should().Be(1);
        await fileRepository.Received(1)
            .GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), token);
        await attachmentRepository.Received(1)
            .GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), token);
    }

    [Test]
    public async Task RunCleanupAsync_WhenCandidateCountExceedsBatchSize_ShouldQueryDatabaseInBatches()
    {
        var oldTimestamp = DateTimeOffset.UtcNow.AddHours(-2);
        var orphanIds = Enumerable.Range(0, 300)
            .Select(_ => Guid.NewGuid())
            .ToArray();
        var observedBatchSizes = new List<int>();

        provider.StreamWithTimestampsAsync(Arg.Any<CancellationToken>())
            .Returns(StreamTimestamps(orphanIds.Select(id => (id, oldTimestamp)).ToList()));
        fileRepository.GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(call =>
            {
                observedBatchSizes.Add(call.ArgAt<IReadOnlyCollection<Guid>>(0).Count);
                return SuccessBlobIds();
            });
        attachmentRepository.GetExistingBlobIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(SuccessBlobIds());
        provider.DeleteAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success()));

        var deleted = await sut.RunCleanupAsync(CancellationToken.None);

        deleted.Should().Be(orphanIds.Length);
        observedBatchSizes.Should().Equal(256, 44);
    }

    private static Task<Result<IReadOnlySet<Guid>>> SuccessBlobIds(params Guid[] ids)
    {
        IReadOnlySet<Guid> set = new HashSet<Guid>(ids);
        return Task.FromResult(Result.Success(set));
    }

    private static async IAsyncEnumerable<(Guid BlobId, DateTimeOffset CreatedAt)> StreamTimestamps(
        List<(Guid BlobId, DateTimeOffset CreatedAt)> blobs)
    {
        foreach (var blob in blobs)
        {
            yield return blob;
            await Task.Yield();
        }
    }

    private static async IAsyncEnumerable<T> ThrowOnEnumeration<T>(Exception ex)
    {
        if (Environment.TickCount == int.MinValue)
            yield return default!;

        await Task.Yield();
        throw ex;
    }
}
