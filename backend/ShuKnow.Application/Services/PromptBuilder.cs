using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Services;

internal class PromptBuilder : IPromptBuilder
{
    public string BuildClassificationPrompt(
        IReadOnlyCollection<FolderSummary> folderTree,
        ChatMessage userMessage,
        IReadOnlyCollection<string> attachmentDescriptions,
        ChatSession? contextSession = null)
    {
        throw new NotImplementedException();
    }
}