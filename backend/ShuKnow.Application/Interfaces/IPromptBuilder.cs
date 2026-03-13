using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Interfaces;

public interface IPromptBuilder
{
    string BuildClassificationPrompt(
        IReadOnlyCollection<Folder> folderTree,
        ChatMessage userMessage,
        IReadOnlyCollection<ChatAttachment> attachments,
        ChatSession? contextSession = null);
}
