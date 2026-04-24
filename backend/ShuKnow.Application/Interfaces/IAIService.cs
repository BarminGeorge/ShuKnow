using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IAiService
{
    [Obsolete("Use ProcessMessageAsync with an explicit session id.")]
    Task<Result> ProcessMessageAsync(
        string content, 
        IReadOnlyCollection<Guid>? attachmentIds,
        UserAiSettings settings, 
        Guid operationId, 
        CancellationToken ct = default);

    Task<Result> ProcessMessageAsync(
        Guid sessionId,
        string content, 
        IReadOnlyCollection<Guid>? attachmentIds,
        UserAiSettings settings, 
        Guid operationId, 
        CancellationToken ct = default)
    {
        return ProcessMessageAsync(content, attachmentIds, settings, operationId, ct);
    }

    Task<UserAiSettings> TestConnectionAsync(UserAiSettings settings, CancellationToken ct = default);
}
