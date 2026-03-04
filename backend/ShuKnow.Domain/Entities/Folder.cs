using Ardalis.Result;
using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;
public class Folder : IEntity<Guid>
{
    public Guid Id { get; }

    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public Guid? ParentFolderId { get; private set; }

    protected Folder()
    {
    }

    public Folder(Guid folderId, Guid userId, string name, string description, Guid? parentFolderId = null)
    {
        Id = folderId;
        UserId = userId;
        Name = name;
        Description = description;
        ParentFolderId = parentFolderId;
    }
}
