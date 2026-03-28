using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;
public class Folder : IEntity<Guid>
{
    public Guid Id { get; private set; }

    public Guid UserId { get; private set; }
    public Guid? ParentFolderId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public int SortOrder { get; private set; }
    public string? Emoji { get; private set; }

    protected Folder()
    {
    }

    public Folder(
        Guid folderId,
        Guid userId,
        string name,
        string description,
        Guid? parentFolderId = null,
        int sortOrder = 0,
        string? emoji = null)
    {
        Id = folderId;
        UserId = userId;
        ParentFolderId = parentFolderId;
        Name = name;
        Description = description;
        SortOrder = sortOrder;
        Emoji = emoji;
    }
}
