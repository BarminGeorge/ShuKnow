using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Services;

internal class PromptBuilder : IPromptBuilder
{
    public string BuildClassificationPrompt(
        IReadOnlyCollection<Folder> folderTree,
        ChatMessage userMessage,
        IReadOnlyCollection<string> attachmentDescriptions,
        ChatSession? contextSession = null)
    {
        throw new NotImplementedException();
    }
}