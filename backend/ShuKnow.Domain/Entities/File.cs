using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class File : IEntity<Guid>
{
    public Guid Id { get; private set; }

    public Guid FolderId { get; private set; }
    public Folder Folder { get; private set; } = null!;
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public long SizeBytes { get; private set; }
    public int Version { get; private set; } = 1;
    public string? ChecksumSha256 { get; private set; }

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
        string? checksumSha256 = null)
    {
        Id = fileId;
        FolderId = folderId;
        Name = name;
        Description = description;
        ContentType = contentType;
        SizeBytes = sizeBytes;
        Version = version;
        ChecksumSha256 = checksumSha256;
    }
}
