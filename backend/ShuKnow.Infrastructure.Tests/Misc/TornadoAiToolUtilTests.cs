using Ardalis.Result;
using AwesomeAssertions;
using LlmTornado.ChatFunctions;
using ShuKnow.Infrastructure.Misc;

namespace ShuKnow.Infrastructure.Tests.Misc;

public class TornadoAiToolUtilTests
{
    [Test]
    public async Task CreateToolRegistration_WhenDispatchingAsyncDelegate_ShouldBindPrimitiveArgumentsAndCancellationToken()
    {
        var captured = new InvocationCapture();
        var registration = TornadoAiToolUtil.CreateToolRegistration(
            (Func<int, bool, string, float, CancellationToken, Task<Result<string>>>)HandlerAsync,
            "sample_tool",
            "Sample tool");

        using var cts = new CancellationTokenSource();

        var result = await registration.Dispatch(
            CreateCall("sample_tool", """{"count":3,"enabled":true,"label":"alpha","ratio":1.5}"""),
            cts.Token);

        result.Status.Should().Be(ResultStatus.Ok);
        captured.Count.Should().Be(3);
        captured.Enabled.Should().BeTrue();
        captured.Label.Should().Be("alpha");
        captured.Ratio.Should().Be(1.5f);
        captured.Token.Should().Be(cts.Token);

        return;

        Task<Result<string>> HandlerAsync(int count, bool enabled, string label, float ratio, CancellationToken ct)
        {
            captured = new InvocationCapture(count, enabled, label, ratio, ct);
            return Task.FromResult(Result.Success("ok"));
        }
    }

    [Test]
    public async Task CreateToolRegistration_WhenDelegateReturnsValueTaskString_ShouldWrapSuccessResult()
    {
        var registration = TornadoAiToolUtil.CreateToolRegistration(
            (Func<int, ValueTask<string>>)HandlerAsync,
            "value_task_tool",
            "Sample tool");

        var result = await registration.Dispatch(
            CreateCall("value_task_tool", """{"count":7}"""),
            CancellationToken.None);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().Be("count:7");

        return;

        ValueTask<string> HandlerAsync(int count) => ValueTask.FromResult($"count:{count}");
    }

    [Test]
    public async Task CreateToolRegistration_WhenRequiredArgumentMissing_ShouldReturnError()
    {
        var registration = TornadoAiToolUtil.CreateToolRegistration(
            (Func<int, Result<string>>)Handler,
            "missing_arg_tool",
            "Sample tool");

        var result = await registration.Dispatch(
            CreateCall("missing_arg_tool", "{}"),
            CancellationToken.None);

        result.Status.Should().Be(ResultStatus.Error);
        result.Errors.Should().Contain(error => error.Contains("missing 'count'"));

        return;

        Result<string> Handler(int count) => Result.Success(count.ToString());
    }

    private static FunctionCall CreateCall(string name, string argumentsJson)
    {
        return new FunctionCall
        {
            Name = name,
            Arguments = argumentsJson
        };
    }

    private sealed record InvocationCapture(
        int Count = 0,
        bool Enabled = false,
        string? Label = null,
        float Ratio = 0,
        CancellationToken Token = default);
}
