using ShuKnow.Domain.Interfaces;
using Ardalis.Result;

namespace ShuKnow.Domain.Entities;

public class File : IEntity<Guid>
{
    public Guid Id { get; }

    public Guid FolderId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public DateTimeOffset UpdatedAt { get; private set; }

    protected File()
    {
    }

    public File(
        Guid fileId,
        Guid folderId,
        string name,
        string description,
        DateTimeOffset? createdAt = null)
    {
        Id = fileId;
        FolderId = folderId;
        Name = name;
        Description = description;
    }
}
