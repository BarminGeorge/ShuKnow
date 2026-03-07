using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class ChatAttachment : IEntity<Guid>
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public long SizeBytes { get; private set; }

    protected ChatAttachment()
    {
    }

    public ChatAttachment(
        Guid attachmentId,
        Guid userId,
        string fileName,
        string contentType,
        long sizeBytes)
    {
        Id = attachmentId;
        UserId = userId;
        FileName = fileName;
        ContentType = contentType;
        SizeBytes = sizeBytes;
    }
}
