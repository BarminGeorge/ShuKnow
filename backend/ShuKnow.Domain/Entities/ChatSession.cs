using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class ChatSession : IEntity<Guid>
{
    private readonly List<ChatMessage> _messages = [];

    public Guid ChatSessionId { get; private set; }
    public Guid Id => ChatSessionId;

    public Guid UserId { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public IReadOnlyCollection<ChatMessage> Messages => _messages.AsReadOnly();

    protected ChatSession()
    {
    }

    public ChatSession(Guid chatSessionId, Guid userId, DateTimeOffset? createdAt = null)
    {
        ChatSessionId = chatSessionId;
        UserId = userId;
        CreatedAt = createdAt ?? DateTimeOffset.UtcNow;
    }

    public ChatMessage AddUserMessage(string content, DateTimeOffset? createdAt = null)
    {
        var message = ChatMessage.CreateUserMessage(content, createdAt);
        _messages.Add(message);
        return message;
    }

    public ChatMessage AddAiMessage(string content, DateTimeOffset? createdAt = null)
    {
        var message = ChatMessage.CreateAiMessage(content, createdAt);
        _messages.Add(message);
        return message;
    }

    public void AddMessage(ChatMessage message)
    {
        ArgumentNullException.ThrowIfNull(message);
        _messages.Add(message);
    }
}
