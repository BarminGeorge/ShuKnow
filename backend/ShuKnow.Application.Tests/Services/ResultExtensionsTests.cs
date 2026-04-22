using Ardalis.Result;
using AwesomeAssertions;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models.Notifications;
using NSubstitute;

namespace ShuKnow.Application.Tests.Services;

public class ResultExtensionsTests
{
    [Test]
    public async Task Act_WhenSourceTaskIsPending_ShouldWaitForItBeforeRunningAction()
    {
        var source = new TaskCompletionSource<Result<int>>();
        var actionCalls = 0;

        var actTask = source.Task.Act(_ => actionCalls++);

        actionCalls.Should().Be(0);

        source.SetResult(Result.Success(42));
        var result = await actTask;

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().Be(42);
        actionCalls.Should().Be(1);
    }

    [Test]
    public async Task Act_WhenSourceTaskFails_ShouldNotRunAction()
    {
        var actionCalls = 0;

        var result = await Task.FromResult(Result<int>.Error("boom"))
            .Act(_ => actionCalls++);

        result.Status.Should().Be(ResultStatus.Error);
        actionCalls.Should().Be(0);
    }

    [Test]
    public async Task ActAsync_WhenSourceTaskFails_ShouldNotRunAsyncAction()
    {
        var actionCalls = 0;

        var result = await Task.FromResult(Result<int>.Error("boom"))
            .ActAsync(_ =>
            {
                actionCalls++;
                return Task.FromResult(Result.Success());
            });

        result.Status.Should().Be(ResultStatus.Error);
        actionCalls.Should().Be(0);
    }

    [Test]
    public async Task BindAsync_WhenSourceTaskSucceeds_ShouldRunBinderAndReturnItsStatus()
    {
        var result = await Task.FromResult(Result.Success(5))
            .BindAsync(value => value > 0 ? Result.Success() : Result.Error("bad"));

        result.Status.Should().Be(ResultStatus.Ok);
    }

    [Test]
    public async Task BindAsync_WhenSourceTaskFails_ShouldNotRunBinder()
    {
        var binderCalls = 0;

        var result = await Task.FromResult(Result<int>.Error("boom"))
            .BindAsync(_ =>
            {
                binderCalls++;
                return Result.Success();
            });

        result.Status.Should().Be(ResultStatus.Error);
        binderCalls.Should().Be(0);
    }

    [Test]
    public async Task Map_WhenSourceTaskSucceeds_ShouldTransformValue()
    {
        var result = await Task.FromResult(Result.Success(5))
            .Map(value => value * 2);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().Be(10);
    }

    [Test]
    public async Task SaveChangesAsync_ForTaskResultOfT_WhenSourceSucceeds_ShouldPersistAndKeepValue()
    {
        var unitOfWork = Substitute.For<IUnitOfWork>();
        unitOfWork.SaveChangesAsync().Returns(Task.FromResult(Result.Success()));

        var result = await Task.FromResult(Result.Success("value"))
            .SaveChangesAsync(unitOfWork);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().Be("value");
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task SaveChangesAsync_ForTaskResultOfT_WhenSourceFails_ShouldNotPersist()
    {
        var unitOfWork = Substitute.For<IUnitOfWork>();

        var result = await Task.FromResult(Result<string>.Error("boom"))
            .SaveChangesAsync(unitOfWork);

        result.Status.Should().Be(ResultStatus.Error);
        await unitOfWork.DidNotReceive().SaveChangesAsync();
    }

    [Test]
    public async Task SaveChangesAsync_ForTaskResult_WhenSourceSucceeds_ShouldPersist()
    {
        var unitOfWork = Substitute.For<IUnitOfWork>();
        unitOfWork.SaveChangesAsync().Returns(Task.FromResult(Result.Success()));

        var result = await Task.FromResult(Result.Success())
            .SaveChangesAsync(unitOfWork);

        result.Status.Should().Be(ResultStatus.Ok);
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task SaveChangesAsync_ForResultOfT_WhenSourceSucceeds_ShouldPersistAndKeepValue()
    {
        var unitOfWork = Substitute.For<IUnitOfWork>();
        unitOfWork.SaveChangesAsync().Returns(Task.FromResult(Result.Success()));

        var result = await Result.Success(7)
            .SaveChangesAsync(unitOfWork);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().Be(7);
        await unitOfWork.Received(1).SaveChangesAsync();
    }

    [Test]
    public async Task ToCreatedAsync_WhenStatusIsOk_ShouldConvertToCreated()
    {
        var result = await Task.FromResult(Result.Success("value"))
            .ToCreatedAsync();

        result.Status.Should().Be(ResultStatus.Created);
        result.Value.Should().Be("value");
    }

    [Test]
    public async Task ToCreatedAsync_WhenStatusIsNotOk_ShouldPreserveOriginalStatus()
    {
        var result = await Task.FromResult(Result<string>.Conflict())
            .ToCreatedAsync();

        result.Status.Should().Be(ResultStatus.Conflict);
    }

    [Test]
    public async Task ActAsync_WithTaskSideEffect_WhenSourceSucceeds_ShouldRunSideEffectAndKeepValue()
    {
        var actionCalls = 0;

        var result = await Task.FromResult(Result.Success(42))
            .ActAsync(_ =>
            {
                actionCalls++;
                return Task.CompletedTask;
            });

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().Be(42);
        actionCalls.Should().Be(1);
    }

    [Test]
    public async Task Act_WithResultOfTDelegate_WhenSourceSucceeds_ShouldRunSideEffectAndKeepValue()
    {
        var actionCalls = 0;

        var result = await Task.FromResult(Result.Success(42))
            .Act<int, string>(_ =>
            {
                actionCalls++;
                return Result.Success("side-effect");
            });

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().Be(42);
        actionCalls.Should().Be(1);
    }

    [Test]
    public async Task Tap_WhenSourceSucceeds_ShouldRunSideEffectAndKeepValue()
    {
        var actionCalls = 0;

        var result = await Task.FromResult(Result.Success(42))
            .Tap(_ =>
            {
                actionCalls++;
                return Task.CompletedTask;
            });

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().Be(42);
        actionCalls.Should().Be(1);
    }

    [Test]
    public async Task TapAsync_ForResultOfT_WhenSourceFails_ShouldNotRunSideEffect()
    {
        var actionCalls = 0;

        var result = await Result<int>.Error("boom")
            .TapAsync(_ =>
            {
                actionCalls++;
                return Task.CompletedTask;
            });

        result.Status.Should().Be(ResultStatus.Error);
        actionCalls.Should().Be(0);
    }

    [Test]
    public void GetFirstErrorOrDefault_WhenValidationErrorExists_ShouldReturnValidationMessage()
    {
        var result = Result.Invalid(new ValidationError("field", "validation failed"));

        result.GetFirstErrorOrDefault("fallback").Should().Be("validation failed");
    }

    [Test]
    public void GetChatProcessingErrorCodeOrDefault_WhenValidationErrorCodeMatchesEnum_ShouldReturnParsedCode()
    {
        var result = Result.Invalid(new ValidationError(
            "field",
            "failed",
            ChatProcessingErrorCode.LlmInvalidResponse.ToString(),
            ValidationSeverity.Error));

        result.GetChatProcessingErrorCodeOrDefault().Should().Be(ChatProcessingErrorCode.LlmInvalidResponse);
    }

    [Test]
    public void InvalidGeneric_WhenCalled_ShouldBuildValidationErrorWithChatErrorCode()
    {
        var result = ShuKnow.Application.Extensions.ResultExtensions.Invalid<int>(
            "failed",
            ChatProcessingErrorCode.InternalError);

        result.Status.Should().Be(ResultStatus.Invalid);
        result.ValidationErrors.Should().ContainSingle();
        var validationError = result.ValidationErrors.Single();
        validationError.ErrorMessage.Should().Be("failed");
        validationError.ErrorCode.Should().Be(ChatProcessingErrorCode.InternalError.ToString());
    }
}
