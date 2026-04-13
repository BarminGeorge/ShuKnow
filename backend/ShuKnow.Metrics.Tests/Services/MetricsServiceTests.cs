using Microsoft.Extensions.Options;
using NSubstitute;
using ShuKnow.Metrics.Configuration;
using ShuKnow.Metrics.Instruments;
using ShuKnow.Metrics.Repositories;
using ShuKnow.Metrics.Services;

namespace ShuKnow.Metrics.Tests.Services;

public class MetricsServiceTests
{
    private static readonly TimeSpan retrievalWindow = TimeSpan.FromDays(30);
    private static readonly TimeSpan retentionWeekStart = TimeSpan.FromDays(7);
    private static readonly TimeSpan retentionWeekEnd = TimeSpan.FromDays(14);

    private IMetricsRepository repository = null!;
    private MetricsService sut = null!;

    [SetUp]
    public void SetUp()
    {
        repository = Substitute.For<IMetricsRepository>();

        repository.TrySaveItemAsync(Arg.Any<Guid>(), Arg.Any<DateTimeOffset>(), Arg.Any<TimeSpan>())
            .Returns(Task.FromResult(true));
        repository.MarkItemAiProcessedAsync(Arg.Any<Guid>(), Arg.Any<TimeSpan>())
            .Returns(Task.CompletedTask);
        repository.IsItemAiProcessedAsync(Arg.Any<Guid>())
            .Returns(Task.FromResult(true));
        repository.TryMarkItemManuallyMovedAsync(Arg.Any<Guid>(), Arg.Any<TimeSpan>())
            .Returns(Task.FromResult(true));
        repository.GetItemSavedAtAsync(Arg.Any<Guid>())
            .Returns(Task.FromResult<DateTimeOffset?>(DateTimeOffset.UtcNow));
        repository.TryMarkItemRetrievedAsync(Arg.Any<Guid>(), Arg.Any<TimeSpan>())
            .Returns(Task.FromResult(true));
        repository.TryRegisterFirstSaveAsync(Arg.Any<Guid>(), Arg.Any<DateTimeOffset>(), Arg.Any<TimeSpan>())
            .Returns(Task.FromResult(true));
        repository.GetUserFirstSaveAtAsync(Arg.Any<Guid>())
            .Returns(Task.FromResult<DateTimeOffset?>(DateTimeOffset.UtcNow.AddDays(-8)));
        repository.TryMarkUserReturnedAsync(Arg.Any<Guid>(), Arg.Any<TimeSpan>())
            .Returns(Task.FromResult(true));

        var options = Options.Create(new MetricsOptions
        {
            RetrievalWindow = retrievalWindow,
            RetentionWeekStart = retentionWeekStart,
            RetentionWeekEnd = retentionWeekEnd
        });

        sut = new MetricsService(new MetricsInstruments(), repository, options);
    }

    [Test]
    public async Task RecordAiItemProcessedAsync_WhenCalled_ShouldPersistAiFlagsAndTrackRetention()
    {
        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();

        await sut.RecordAiItemProcessedAsync(userId, itemId);

        await repository.Received(1)
            .TrySaveItemAsync(itemId, Arg.Any<DateTimeOffset>(), retrievalWindow);
        await repository.Received(1).MarkItemAiProcessedAsync(itemId, retrievalWindow);
        await repository.Received(1)
            .TryRegisterFirstSaveAsync(userId, Arg.Any<DateTimeOffset>(), retentionWeekEnd);
    }

    [Test]
    public async Task RecordContentSavedAsync_WhenCalled_ShouldPersistItemAndTrackRetention()
    {
        var userId = Guid.NewGuid();
        var itemId = Guid.NewGuid();

        await sut.RecordContentSavedAsync(userId, itemId);

        await repository.Received(1)
            .TrySaveItemAsync(itemId, Arg.Any<DateTimeOffset>(), retrievalWindow);
        await repository.Received(1)
            .TryRegisterFirstSaveAsync(userId, Arg.Any<DateTimeOffset>(), retentionWeekEnd);
    }

    [Test]
    public async Task RecordContentSavedAsync_WhenFirstSaveAlreadyExistsAndUserInReturnWindow_ShouldMarkReturned()
    {
        var userId = Guid.NewGuid();

        repository.TryRegisterFirstSaveAsync(Arg.Any<Guid>(), Arg.Any<DateTimeOffset>(), Arg.Any<TimeSpan>())
            .Returns(Task.FromResult(false));
        repository.GetUserFirstSaveAtAsync(userId)
            .Returns(Task.FromResult<DateTimeOffset?>(DateTimeOffset.UtcNow.AddDays(-8)));

        await sut.RecordContentSavedAsync(userId, Guid.NewGuid());

        await repository.Received(1).GetUserFirstSaveAtAsync(userId);
        await repository.Received(1).TryMarkUserReturnedAsync(userId, retentionWeekEnd);
    }

    [Test]
    public async Task RecordContentSavedAsync_WhenUserOutsideReturnWindow_ShouldNotMarkReturned()
    {
        var userId = Guid.NewGuid();

        repository.TryRegisterFirstSaveAsync(Arg.Any<Guid>(), Arg.Any<DateTimeOffset>(), Arg.Any<TimeSpan>())
            .Returns(Task.FromResult(false));
        repository.GetUserFirstSaveAtAsync(userId)
            .Returns(Task.FromResult<DateTimeOffset?>(DateTimeOffset.UtcNow.AddDays(-3)));

        await sut.RecordContentSavedAsync(userId, Guid.NewGuid());

        await repository.DidNotReceive().TryMarkUserReturnedAsync(Arg.Any<Guid>(), Arg.Any<TimeSpan>());
    }

    [Test]
    public async Task RecordManualMoveAsync_WhenItemIsNotAiProcessed_ShouldNotMarkManualMove()
    {
        var itemId = Guid.NewGuid();
        repository.IsItemAiProcessedAsync(itemId).Returns(Task.FromResult(false));

        await sut.RecordManualMoveAsync(itemId);

        await repository.DidNotReceive().TryMarkItemManuallyMovedAsync(Arg.Any<Guid>(), Arg.Any<TimeSpan>());
    }

    [Test]
    public async Task RecordManualMoveAsync_WhenItemIsAiProcessed_ShouldMarkManualMove()
    {
        var itemId = Guid.NewGuid();
        repository.IsItemAiProcessedAsync(itemId).Returns(Task.FromResult(true));

        await sut.RecordManualMoveAsync(itemId);

        await repository.Received(1).TryMarkItemManuallyMovedAsync(itemId, retrievalWindow);
    }

    [Test]
    public async Task RecordContentOpenedAsync_WhenItemWasNeverSaved_ShouldNotMarkRetrieved()
    {
        var itemId = Guid.NewGuid();
        repository.GetItemSavedAtAsync(itemId).Returns(Task.FromResult<DateTimeOffset?>(null));

        await sut.RecordContentOpenedAsync(itemId);

        await repository.DidNotReceive().TryMarkItemRetrievedAsync(Arg.Any<Guid>(), Arg.Any<TimeSpan>());
    }

    [Test]
    public async Task RecordContentOpenedAsync_WhenSavedWithinWindow_ShouldMarkRetrieved()
    {
        var itemId = Guid.NewGuid();
        repository.GetItemSavedAtAsync(itemId).Returns(Task.FromResult<DateTimeOffset?>(DateTimeOffset.UtcNow.AddDays(-1)));

        await sut.RecordContentOpenedAsync(itemId);

        await repository.Received(1).TryMarkItemRetrievedAsync(itemId, retrievalWindow);
    }

    [Test]
    public async Task RecordContentOpenedAsync_WhenSavedOutsideWindow_ShouldNotMarkRetrieved()
    {
        var itemId = Guid.NewGuid();
        repository.GetItemSavedAtAsync(itemId)
            .Returns(Task.FromResult<DateTimeOffset?>(DateTimeOffset.UtcNow.AddDays(-31)));

        await sut.RecordContentOpenedAsync(itemId);

        await repository.DidNotReceive().TryMarkItemRetrievedAsync(itemId, retrievalWindow);
    }
}
