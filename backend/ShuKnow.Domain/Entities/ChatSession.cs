using Ardalis.Result;
using ShuKnow.Domain.Enums;
using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class ChatSession : IEntity<Guid>
{
    private readonly List<ChatMessage> messages = [];
    public Guid Id { get; private set; }

    public Guid UserId { get; private set; }
    public ChatSessionStatus Status { get; private set; } = ChatSessionStatus.Active;
    public IReadOnlyCollection<ChatMessage> Messages => messages.AsReadOnly();

    protected ChatSession()
    {
    }

    public ChatSession(Guid chatSessionId, Guid userId, ChatSessionStatus status = ChatSessionStatus.Active)
    {
        Id = chatSessionId;
        UserId = userId;
        Status = status;
    }

    public Result AddMessage(ChatMessage message)
    {
        if (message.SessionId != Id)
        {
            return Result.Error("The message belongs to another chat session.");
        }

        messages.Add(message);
        return Result.Success();
    }

    public void Close()
    {
        Status = ChatSessionStatus.Closed;
    }
}
