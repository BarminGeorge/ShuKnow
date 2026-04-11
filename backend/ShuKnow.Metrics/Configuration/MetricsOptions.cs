namespace ShuKnow.Metrics.Configuration;

public class MetricsOptions
{
    public const string SectionName = "Metrics";

    public TimeSpan RetrievalWindow { get; init; } = TimeSpan.FromDays(30);
    public TimeSpan RetentionWeekStart { get; init; } = TimeSpan.FromDays(7);
    public TimeSpan RetentionWeekEnd { get; init; } = TimeSpan.FromDays(14);
}