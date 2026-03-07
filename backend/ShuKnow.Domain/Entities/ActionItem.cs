using ShuKnow.Domain.Enums;
using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class ActionItem : IEntity<Guid>
{
    public Guid Id { get; private set; }
    public Guid ActionId { get; private set; }
    public int SequenceNo { get; private set; }
    public ActionItemType ItemType { get; private set; }
    public bool RolledBack { get; private set; }
    public string? RollbackNote { get; private set; }

    protected ActionItem()
    {
    }

    public ActionItem(
        Guid actionItemId,
        Guid actionId,
        int sequenceNo,
        ActionItemType itemType,
        bool rolledBack = false,
        string? rollbackNote = null)
    {
        Id = actionItemId;
        ActionId = actionId;
        SequenceNo = sequenceNo;
        ItemType = itemType;
        RolledBack = rolledBack;
        RollbackNote = rollbackNote;
    }
}
