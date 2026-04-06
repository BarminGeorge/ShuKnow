using Ardalis.Result;

namespace ShuKnow.Infrastructure.Misc;

public static class LatencyMeasureUtil
{
    public static async Task<Result<int>> MeasureAsync<T>(Func<Task<Result<T>>> function)
    {
        // TODO: implement proper measurement
        var result = await function();
        return result.Map(_ => 42);
    }
}