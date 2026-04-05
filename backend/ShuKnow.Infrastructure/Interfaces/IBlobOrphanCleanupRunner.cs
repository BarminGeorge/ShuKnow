namespace ShuKnow.Infrastructure.Interfaces;

public interface IBlobOrphanCleanupRunner
{
    Task<int> RunCleanupAsync(CancellationToken ct);
}
