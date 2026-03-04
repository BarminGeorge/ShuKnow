using Ardalis.Result;
using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class ChatSession : IEntity<Guid>
{
    private readonly List<ChatMessage> messages = [];
    public Guid Id { get; }

    public Guid UserId { get; private set; }
    public IReadOnlyCollection<ChatMessage> Messages => messages.AsReadOnly();

    protected ChatSession()
    {
    }

    public ChatSession(Guid chatSessionId, Guid userId, DateTimeOffset? createdAt = null)
    {
        Id = chatSessionId;
        UserId = userId;
    }
    
    public Result AddMessage(ChatMessage message)
    {
        messages.Add(message);
        return Result.Success();
    }
}
