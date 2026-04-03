using System.ComponentModel.DataAnnotations;

namespace ShuKnow.Application.Common;

public class OrphanCleanupOptions
{
    public const string SectionName = "BlobStorage:OrphanCleanup";
    
    [Range(0, double.MaxValue, MinimumIsExclusive = true)]
    public double IntervalHours { get; set; } = 6;
    
    [Range(0, double.MaxValue, MinimumIsExclusive = true)]
    public double GracePeriodMinutes { get; set; } = 60;
}