namespace ShuKnow.WebAPI.Utility;

internal static class RangeHeaderParser
{
    public static bool TryParse(string? range, out long? rangeStart, out long? rangeEnd)
    {
        rangeStart = null;
        rangeEnd = null;

        if (string.IsNullOrWhiteSpace(range))
            return true;

        if (!range.StartsWith("bytes=", StringComparison.OrdinalIgnoreCase))
            return false;

        var parts = range["bytes=".Length..]
            .Split('-', 2)
            .Select(part => part.Trim())
            .ToArray();

        if (parts.Length != 2 || string.IsNullOrEmpty(parts[0]))
            return false;

        if (!long.TryParse(parts[0], out var start))
            return false;

        rangeStart = start;

        if (string.IsNullOrEmpty(parts[1]))
            return true;

        if (!long.TryParse(parts[1], out var inclusiveEnd))
            return false;

        rangeEnd = inclusiveEnd + 1;
        return true;
    }
}
