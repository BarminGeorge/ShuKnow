using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class ChatAttachment : IEntity<Guid>
{
    public Guid Id { get; private set; }
    public Guid BlobId { get; private set; }
    public Guid UserId { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public long SizeBytes { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public bool IsConsumed { get; private set; }

    protected ChatAttachment()
    {
    }

    public ChatAttachment(
        Guid attachmentId,
        Guid userId,
        Guid blobId,
        string fileName,
        string contentType,
        long sizeBytes)
    {
        Id = attachmentId;
        UserId = userId;
        BlobId = blobId;
        FileName = fileName;
        ContentType = contentType;
        SizeBytes = sizeBytes;
        CreatedAt = DateTimeOffset.UtcNow;
        IsConsumed = false;
    }

    public void SetBlobId(Guid blobId)
    {
        BlobId = blobId;
    }
    
    public void MarkAsConsumed()
    {
        IsConsumed = true;
    }
}
