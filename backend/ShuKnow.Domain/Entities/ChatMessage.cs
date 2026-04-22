using ShuKnow.Domain.Enums;
using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class ChatMessage : IEntity<Guid>
{
    public Guid Id { get; private set; }
    public Guid SessionId { get; private set; }
    public ChatMessageRole Role { get; private set; }
    public string Content { get; private set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; private set; }

    protected ChatMessage()
    {
    }

    private ChatMessage(
        Guid chatMessageId,
        Guid sessionId,
        ChatMessageRole role,
        string content,
        DateTimeOffset? createdAt = null)
    {
        Id = chatMessageId;
        SessionId = sessionId;
        Role = role;
        Content = content;
        CreatedAt = createdAt ?? DateTimeOffset.UtcNow;
    }

    public static ChatMessage CreateUserMessage(Guid sessionId, string content, DateTimeOffset? createdAt = null)
    {
        return new ChatMessage(
            chatMessageId: Guid.NewGuid(),
            sessionId: sessionId,
            role: ChatMessageRole.User,
            content: content,
            createdAt: createdAt);
    }

    public static ChatMessage CreateAiMessage(
        Guid messageId,
        Guid sessionId,
        string content,
        DateTimeOffset? createdAt = null)
    {
        return new ChatMessage(
            chatMessageId: messageId,
            sessionId: sessionId,
            role: ChatMessageRole.Ai,
            content: content,
            createdAt: createdAt);
    }

    public static ChatMessage CreateSystemMessage(Guid sessionId, string content, DateTimeOffset? createdAt = null)
    {
        return new ChatMessage(
            chatMessageId: Guid.NewGuid(),
            sessionId: sessionId,
            role: ChatMessageRole.System,
            content: content,
            createdAt: createdAt);
    }
}
