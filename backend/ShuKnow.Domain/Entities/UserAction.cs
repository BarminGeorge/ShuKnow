using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class UserAction : IEntity<Guid>
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public Guid OperationId { get; private set; }
    public Guid? ChatSessionId { get; private set; }
    public Guid? TriggerMessageId { get; private set; }
    public string Summary { get; private set; } = string.Empty;
    public int ItemCount { get; private set; }
    public bool IsRolledBack { get; private set; }
    public string? RollbackError { get; private set; }

    protected UserAction()
    {
    }

    public UserAction(
        Guid actionId,
        Guid userId,
        Guid operationId,
        string summary,
        Guid? chatSessionId = null,
        Guid? triggerMessageId = null,
        int itemCount = 0,
        bool isRolledBack = false,
        string? rollbackError = null)
    {
        Id = actionId;
        UserId = userId;
        OperationId = operationId;
        ChatSessionId = chatSessionId;
        TriggerMessageId = triggerMessageId;
        Summary = summary;
        ItemCount = itemCount;
        IsRolledBack = isRolledBack;
        RollbackError = rollbackError;
    }
}
