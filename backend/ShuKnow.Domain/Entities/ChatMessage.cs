using ShuKnow.Domain.Enums;
using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class ChatMessage : IEntity<Guid>
{
    public Guid ChatMessageId { get; private set; }
    public Guid Id => ChatMessageId;

    public ChatMessageRole Role { get; private set; }
    public string Content { get; private set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; private set; }

    protected ChatMessage()
    {
    }

    private ChatMessage(Guid chatMessageId, ChatMessageRole role, string content, DateTimeOffset createdAt)
    {
        ValidateId(chatMessageId);
        ValidateRole(role);
        ValidateContent(content);

        ChatMessageId = chatMessageId;
        Role = role;
        Content = content.Trim();
        CreatedAt = createdAt;
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

    private static void ValidateContent(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            throw new ArgumentException("Message content cannot be empty.", nameof(content));
        }
    }

    private static void ValidateId(Guid id)
    {
        if (id == Guid.Empty)
        {
            throw new ArgumentException("Message id cannot be empty.", nameof(id));
        }
    }

    private static void ValidateRole(ChatMessageRole role)
    {
        if (!Enum.IsDefined(role))
        {
            throw new ArgumentException("Invalid message role.", nameof(role));
        }
    }
}
