namespace ShuKnow.Application.Common;

public class OrphanCleanupOptions
{
    public const string SectionName = "BlobStorage:OrphanCleanup";

    public double IntervalHours { get; set; } = 6;

    public double GracePeriodMinutes { get; set; } = 60;

    public OrphanCleanupOptions Validate()
    {
        if (IntervalHours <= 0)
            throw new InvalidOperationException(
                $"{SectionName}:IntervalHours must be positive, got {IntervalHours}");

        if (GracePeriodMinutes <= 0)
            throw new InvalidOperationException(
                $"{SectionName}:GracePeriodMinutes must be positive, got {GracePeriodMinutes}");

        if (GracePeriodMinutes > IntervalHours * 60)
            throw new InvalidOperationException(
                $"{SectionName}:GracePeriodMinutes must be less, than {SectionName}:IntervalHours hours, got {GracePeriodMinutes} minutes > {IntervalHours} hours");

        return this;
    }
}