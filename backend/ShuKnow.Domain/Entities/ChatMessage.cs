using ShuKnow.Domain.Enums;
using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class ChatMessage : IEntity<Guid>
{
    public Guid Id { get; }
    public ChatMessageRole Role { get; private set; }
    public string Content { get; private set; } = string.Empty;

    protected ChatMessage()
    {
    }

    private ChatMessage(Guid chatMessageId, ChatMessageRole role, string content, DateTimeOffset createdAt)
    {
        Id = chatMessageId;
        Role = role;
        Content = content.Trim();
    }

    public static ChatMessage CreateUserMessage(string content, DateTimeOffset? createdAt = null)
    {
        return new ChatMessage(
            chatMessageId: Guid.NewGuid(),
            role: ChatMessageRole.User,
            content: content,
            createdAt: createdAt ?? DateTimeOffset.UtcNow);
    }

    public static ChatMessage CreateAiMessage(string content, DateTimeOffset? createdAt = null)
    {
        return new ChatMessage(
            chatMessageId: Guid.NewGuid(),
            role: ChatMessageRole.Ai,
            content: content,
            createdAt: createdAt ?? DateTimeOffset.UtcNow);
    }
}
