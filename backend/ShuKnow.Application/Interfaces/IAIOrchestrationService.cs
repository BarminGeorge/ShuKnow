using Ardalis.Result;

namespace ShuKnow.Application.Interfaces;

public interface IAiOrchestrationService
{
    Task<Result> ProcessMessageAsync(
        string content,
        string? context,
        IReadOnlyCollection<Guid>? attachmentIds,
        string callerConnectionId,
        CancellationToken ct = default);
}
