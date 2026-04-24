using System.ComponentModel.DataAnnotations;

namespace ShuKnow.Application.Common;

public class ChatSessionCleanupOptions
{
    public const string SectionName = "ChatSessions:Cleanup";

    [Range(0, double.MaxValue, MinimumIsExclusive = true)]
    public double IntervalMinutes { get; set; } = 30;

    [Range(0, double.MaxValue, MinimumIsExclusive = true)]
    public double MaxAgeMinutes { get; set; } = 60;
}
