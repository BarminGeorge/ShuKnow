using System.ComponentModel.DataAnnotations;

namespace ShuKnow.Application.Common;

public class TornadoAiOptions
{
    public const string SectionName = "TornadoAi";

    [Range(0.0, 2.0)]
    public double Temperature { get; set; } = 0.3;

    [Range(1, 100)]
    public int MaxTurns { get; set; } = 10;
}
