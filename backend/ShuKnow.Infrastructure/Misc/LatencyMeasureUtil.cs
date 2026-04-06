using System.Diagnostics;
using Ardalis.Result;

namespace ShuKnow.Infrastructure.Misc;

public static class LatencyMeasureUtil
{
    public static async Task<Result<int>> MeasureAsync<T>(Func<Task<Result<T>>> function)
    {
        var startTimestamp = Stopwatch.GetTimestamp();
        var result = await function();
        var elapsed = Stopwatch.GetElapsedTime(startTimestamp);

        return result.Map(_ => (int)Math.Min(elapsed.TotalMilliseconds, int.MaxValue));
    }
}
