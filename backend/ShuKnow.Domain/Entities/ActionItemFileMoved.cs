using System.Text.Json;

namespace ShuKnow.Domain.Entities;

public class ActionItemFileMoved
{
    public Guid ActionItemId { get; private set; }
    public Guid FileId { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public Guid FromFolderId { get; private set; }
    public Guid ToFolderId { get; private set; }
    public int FileVersionBefore { get; private set; }
    public int FileVersionAfter { get; private set; }
    public JsonDocument? Details { get; private set; }

    protected ActionItemFileMoved()
    {
    }

    public ActionItemFileMoved(
        Guid actionItemId,
        Guid fileId,
        string fileName,
        Guid fromFolderId,
        Guid toFolderId,
        int fileVersionBefore,
        int fileVersionAfter,
        JsonDocument? details = null)
    {
        ActionItemId = actionItemId;
        FileId = fileId;
        FileName = fileName;
        FromFolderId = fromFolderId;
        ToFolderId = toFolderId;
        FileVersionBefore = fileVersionBefore;
        FileVersionAfter = fileVersionAfter;
        Details = details;
    }
}
