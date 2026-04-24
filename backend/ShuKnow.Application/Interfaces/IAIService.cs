using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IAiService
{
    Task<Result> ProcessMessageAsync(
        Guid sessionId,
        string content, 
        IReadOnlyCollection<Guid>? attachmentIds,
        UserAiSettings settings, 
        Guid operationId,
        CancellationToken ct = default);

    Task<UserAiSettings> TestConnectionAsync(UserAiSettings settings, CancellationToken ct = default);
}
