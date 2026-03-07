using ShuKnow.Domain.Enums;
using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class ChatMessage : IEntity<Guid>
{
    public Guid Id { get; private set; }
    public Guid SessionId { get; private set; }
    public ChatMessageRole Role { get; private set; }
    public string Content { get; private set; } = string.Empty;
    public int? Index { get; private set; }

    protected ChatMessage()
    {
    }

    private ChatMessage(Guid chatMessageId, Guid sessionId, ChatMessageRole role, string content, int? index = null)
    {
        Id = chatMessageId;
        SessionId = sessionId;
        Role = role;
        Content = content;
        Index = index;
    }

    public static ChatMessage CreateUserMessage(Guid sessionId, string content, int? index = null)
    {
        return new ChatMessage(
            chatMessageId: Guid.NewGuid(),
            sessionId: sessionId,
            role: ChatMessageRole.User,
            content: content,
            index: index);
    }

    public static ChatMessage CreateAiMessage(Guid sessionId, string content, int? index = null)
    {
        return new ChatMessage(
            chatMessageId: Guid.NewGuid(),
            sessionId: sessionId,
            role: ChatMessageRole.Ai,
            content: content,
            index: index);
    }

    public static ChatMessage CreateSystemMessage(Guid sessionId, string content, int? index = null)
    {
        return new ChatMessage(
            chatMessageId: Guid.NewGuid(),
            sessionId: sessionId,
            role: ChatMessageRole.System,
            content: content,
            index: index);
    }
}
