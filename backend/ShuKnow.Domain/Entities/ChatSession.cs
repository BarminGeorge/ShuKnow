using ShuKnow.Domain.Enums;
using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class ChatSession : IEntity<Guid>
{
    public Guid Id { get; private set; }

    public Guid UserId { get; private set; }
    public ChatSessionStatus Status { get; private set; } = ChatSessionStatus.Active;
    
    public virtual IReadOnlyCollection<ChatMessage> Messages { get; private set; } = new List<ChatMessage>();

    protected ChatSession()
    {
    }

    public ChatSession(Guid chatSessionId, Guid userId, ChatSessionStatus status = ChatSessionStatus.Active)
    {
        Id = chatSessionId;
        UserId = userId;
        Status = status;
    }

    public void Close()
    {
        Status = ChatSessionStatus.Closed;
    }
}
