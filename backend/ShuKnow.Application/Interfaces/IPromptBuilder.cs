using ShuKnow.Application.Models;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IPromptBuilder
{
    string BuildClassificationPrompt(
        IReadOnlyCollection<FolderSummary> folderTree,
        ChatMessage userMessage,
        IReadOnlyCollection<string> attachmentDescriptions,
        ChatSession? contextSession = null);
}
