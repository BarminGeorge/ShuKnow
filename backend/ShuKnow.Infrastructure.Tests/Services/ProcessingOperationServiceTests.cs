using AwesomeAssertions;
using ShuKnow.Infrastructure.Services;

namespace ShuKnow.Infrastructure.Tests.Services;

public class ProcessingOperationServiceTests
{
    private ProcessingOperationService sut = null!;

    [SetUp]
    public void SetUp()
    {
        sut = new ProcessingOperationService();
    }

    [Test]
    public void BeginOperation_WhenCalled_ShouldCreateOperationWithIdAndCancellationSource()
    {
        var result = sut.BeginOperation("connection-1");

        result.OperationId.Should().NotBe(Guid.Empty);
        result.CancellationTokenSource.Should().NotBeNull();
        result.CancellationTokenSource.IsCancellationRequested.Should().BeFalse();
    }

    [Test]
    public void BeginOperation_WhenOperationAlreadyExists_ShouldCancelAndDisposePreviousOperation()
    {
        var existing = sut.BeginOperation("connection-1");

        var replacement = sut.BeginOperation("connection-1");

        replacement.OperationId.Should().NotBe(existing.OperationId);
        existing.CancellationTokenSource.IsCancellationRequested.Should().BeTrue();
        var act = () => existing.CancellationTokenSource.Cancel();
        act.Should().Throw<ObjectDisposedException>();
    }

    [Test]
    public void CancelOperation_WhenOperationExists_ShouldCancelAndDisposeOperation()
    {
        var operation = sut.BeginOperation("connection-1");

        sut.CancelOperation("connection-1");

        operation.CancellationTokenSource.IsCancellationRequested.Should().BeTrue();
        var act = () => operation.CancellationTokenSource.Cancel();
        act.Should().Throw<ObjectDisposedException>();
    }

    [Test]
    public void CompleteOperation_WhenOperationExists_ShouldRemoveItWithoutCancellingIt()
    {
        var operation = sut.BeginOperation("connection-1");

        sut.CompleteOperation("connection-1", operation.OperationId);
        sut.CancelOperation("connection-1");

        operation.CancellationTokenSource.IsCancellationRequested.Should().BeFalse();
        var act = () => operation.CancellationTokenSource.Cancel();
        act.Should().Throw<ObjectDisposedException>();
    }

    [Test]
    public void CompleteOperation_WhenOperationIdDoesNotMatch_ShouldKeepNewerOperationTracked()
    {
        var existing = sut.BeginOperation("connection-1");
        var replacement = sut.BeginOperation("connection-1");

        sut.CompleteOperation("connection-1", existing.OperationId);
        sut.CancelOperation("connection-1");

        replacement.CancellationTokenSource.IsCancellationRequested.Should().BeTrue();
        var act = () => replacement.CancellationTokenSource.Cancel();
        act.Should().Throw<ObjectDisposedException>();
    }
}
