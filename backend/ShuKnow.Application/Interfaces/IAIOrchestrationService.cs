using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IAiOrchestrationService
{
    Task<Result<UserAction>> ProcessMessageAsync(
        ChatMessage userMessage,
        IReadOnlyCollection<ChatAttachment>? attachments,
        string callerConnectionId,
        CancellationToken ct = default);
}
