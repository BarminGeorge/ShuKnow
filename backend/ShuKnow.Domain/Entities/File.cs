using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class File : IEntity<Guid>, IOrderedItem
{
    public Guid Id { get; private set; }
    public Guid BlobId { get; set; }

    public Guid FolderId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public long SizeBytes { get; private set; }
    public int Version { get; private set; } = 1;
    public string? ChecksumSha256 { get; private set; }
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; private set; }

    protected File()
    {
    }

    public File(
        Guid fileId,
        Guid folderId,
        string name,
        string description,
        string contentType,
        long sizeBytes,
        int version = 1,
        string? checksumSha256 = null,
        int sortOrder = 0,
        DateTimeOffset? createdAt = null)
    {
        Id = fileId;
        FolderId = folderId;
        Name = name;
        Description = description;
        ContentType = contentType;
        SizeBytes = sizeBytes;
        Version = version;
        ChecksumSha256 = checksumSha256;
        SortOrder = sortOrder;
        CreatedAt = createdAt ?? DateTimeOffset.UtcNow;
    }

    public void UpdateMetadata(string name, string description)
    {
        Name = name;
        Description = description;
    }

    public void ReplaceContent(string contentType, long sizeBytes, string? checksumSha256 = null)
    {
        ContentType = contentType;
        SizeBytes = sizeBytes;
        ChecksumSha256 = checksumSha256;
        Version++;
    }

    public void MoveTo(Guid targetFolderId)
    {
        FolderId = targetFolderId;
        Version++;
    }
}
