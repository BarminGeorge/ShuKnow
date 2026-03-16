using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Services;

internal class PromptPreparationService(
    IFolderService folderService,
    IAttachmentService attachmentService,
    IPromptBuilder promptBuilder) 
    : IPromptPreparationService
{
    public Task<Result<PreparedPrompt>> PrepareAsync(
        ChatMessage userMessage,
        IReadOnlyCollection<Guid>? attachmentIds,
        ChatSession? contextSession = null,
        CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}
