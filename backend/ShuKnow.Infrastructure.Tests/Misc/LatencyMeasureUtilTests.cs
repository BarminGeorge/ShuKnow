using Ardalis.Result;
using AwesomeAssertions;
using ShuKnow.Infrastructure.Misc;

namespace ShuKnow.Infrastructure.Tests.Misc;

public class LatencyMeasureUtilTests
{
    [Test]
    public async Task MeasureAsync_WhenOperationSucceeds_ShouldReturnMeasuredLatency()
    {
        var result = await LatencyMeasureUtil.MeasureAsync(async () =>
        {
            await Task.Delay(30);
            return Result.Success("ok");
        });

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.Should().BeGreaterThanOrEqualTo(20);
    }

    [Test]
    public async Task MeasureAsync_WhenOperationFails_ShouldPreserveFailure()
    {
        var result = await LatencyMeasureUtil.MeasureAsync(() =>
            Task.FromResult(Result<string>.Error("connection failed")));

        result.Status.Should().Be(ResultStatus.Error);
        result.Errors.Should().ContainSingle().Which.Should().Be("connection failed");
    }
}
