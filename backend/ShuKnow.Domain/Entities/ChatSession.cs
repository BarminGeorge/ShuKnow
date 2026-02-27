using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class ChatSession : IEntity<Guid>
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private readonly List<ChatMessage> _messages = [];
    public IReadOnlyCollection<ChatMessage> Messages => _messages.AsReadOnly();

    protected ChatSession()
    {
    }

    public ChatSession(Guid userId)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        CreatedAt = DateTime.UtcNow;
    }

    public ChatMessage AddMessage(Enums.ChatRole role, string content, IReadOnlyCollection<ValueObjects.Attachment>? attachments = null)
    {
        var message = new ChatMessage(Id, role, content, attachments);
        _messages.Add(message);
        return message;
    }
}
