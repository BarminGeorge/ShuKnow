using System.Text.Json;

namespace ShuKnow.Domain.Entities;

public class ActionItemFileCreated
{
    public Guid ActionItemId { get; private set; }
    public Guid FileId { get; private set; }
    public Guid? FolderId { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public int FileVersionAfter { get; private set; }
    public JsonDocument? Details { get; private set; }

    protected ActionItemFileCreated()
    {
    }

    public ActionItemFileCreated(
        Guid actionItemId,
        Guid fileId,
        Guid? folderId,
        string fileName,
        int fileVersionAfter,
        JsonDocument? details = null)
    {
        ActionItemId = actionItemId;
        FileId = fileId;
        FolderId = folderId;
        FileName = fileName;
        FileVersionAfter = fileVersionAfter;
        Details = details;
    }
}
