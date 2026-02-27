using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class Folder : IEntity<Guid>
{
    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public string Description { get; private set; }
    public string? ImagePath { get; private set; }
    public Guid? ParentFolderId { get; private set; }
    public Guid UserId { get; private set; }
    public int Position { get; private set; }
    public DateTime CreatedAt { get; private set; }

    private readonly List<Folder> _subFolders = [];
    public IReadOnlyCollection<Folder> SubFolders => _subFolders.AsReadOnly();

    private readonly List<KnowledgeFile> _files = [];
    public IReadOnlyCollection<KnowledgeFile> Files => _files.AsReadOnly();

    protected Folder()
    {
        Name = string.Empty;
        Description = string.Empty;
    }

    public Folder(string name, string description, Guid userId, Guid? parentFolderId = null, int position = 0)
    {
        ArgumentException.ThrowIfNullOrEmpty(name);

        Id = Guid.NewGuid();
        Name = name;
        Description = description;
        UserId = userId;
        ParentFolderId = parentFolderId;
        Position = position;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateName(string name)
    {
        ArgumentException.ThrowIfNullOrEmpty(name);
        Name = name;
    }

    public void UpdateDescription(string description)
    {
        Description = description;
    }

    public void UpdateImagePath(string? imagePath)
    {
        ImagePath = imagePath;
    }

    public void UpdatePosition(int position)
    {
        Position = position;
    }
}
