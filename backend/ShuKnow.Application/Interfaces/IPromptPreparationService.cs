using Ardalis.Result;
using ShuKnow.Application.Models;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IPromptPreparationService
{
    Task<Result<PreparedPrompt>> PrepareAsync(
        ChatMessage userMessage,
        IReadOnlyCollection<Guid>? attachmentIds,
        ChatSession? contextSession = null,
        CancellationToken ct = default);
}