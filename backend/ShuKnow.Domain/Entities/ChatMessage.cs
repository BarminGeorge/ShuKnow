using ShuKnow.Domain.Enums;
using ShuKnow.Domain.Interfaces;
using ShuKnow.Domain.ValueObjects;

namespace ShuKnow.Domain.Entities;

public class ChatMessage : IEntity<Guid>
{
    public Guid Id { get; private set; }
    public Guid SessionId { get; private set; }
    public ChatRole Role { get; private set; }
    public string Content { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private readonly List<Attachment> _attachments = [];
    public IReadOnlyCollection<Attachment> Attachments => _attachments.AsReadOnly();

    protected ChatMessage()
    {
        Content = string.Empty;
    }

    public ChatMessage(Guid sessionId, ChatRole role, string content, IReadOnlyCollection<Attachment>? attachments = null)
    {
        ArgumentException.ThrowIfNullOrEmpty(content);

        Id = Guid.NewGuid();
        SessionId = sessionId;
        Role = role;
        Content = content;
        CreatedAt = DateTime.UtcNow;

        if (attachments is not null)
            _attachments.AddRange(attachments);
    }
}
