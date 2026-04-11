namespace ShuKnow.Metrics.Configuration;

public class MetricsOptions
{
    public const string SectionName = "Metrics";

    public TimeSpan RetrievalWindow { get; set; } = TimeSpan.FromDays(30);
    public TimeSpan RetentionWeekStart { get; set; } = TimeSpan.FromDays(7);
    public TimeSpan RetentionWeekEnd { get; set; } = TimeSpan.FromDays(14);
}