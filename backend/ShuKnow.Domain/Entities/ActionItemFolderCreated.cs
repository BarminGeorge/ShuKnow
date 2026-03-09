using System.Text.Json;

namespace ShuKnow.Domain.Entities;

public class ActionItemFolderCreated
{
    public Guid ActionItemId { get; private set; }
    public Guid FolderId { get; private set; }
    public string FolderName { get; private set; } = string.Empty;
    public Guid? ParentFolderId { get; private set; }
    public JsonDocument? Details { get; private set; }

    protected ActionItemFolderCreated()
    {
    }

    public ActionItemFolderCreated(
        Guid actionItemId,
        Guid folderId,
        string folderName,
        Guid? parentFolderId = null,
        JsonDocument? details = null)
    {
        ActionItemId = actionItemId;
        FolderId = folderId;
        FolderName = folderName;
        ParentFolderId = parentFolderId;
        Details = details;
    }
}
