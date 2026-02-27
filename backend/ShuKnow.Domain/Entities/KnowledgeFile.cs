using ShuKnow.Domain.Interfaces;
using ShuKnow.Domain.ValueObjects;

namespace ShuKnow.Domain.Entities;

public class KnowledgeFile : IEntity<Guid>
{
    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public Guid FolderId { get; private set; }
    public FileContent Content { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    protected KnowledgeFile()
    {
        Name = string.Empty;
        Content = FileContent.FromText(string.Empty);
    }

    public KnowledgeFile(string name, Guid folderId, FileContent content)
    {
        ArgumentException.ThrowIfNullOrEmpty(name);
        ArgumentNullException.ThrowIfNull(content);

        Id = Guid.NewGuid();
        Name = name;
        FolderId = folderId;
        Content = content;
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateName(string name)
    {
        ArgumentException.ThrowIfNullOrEmpty(name);
        Name = name;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateContent(FileContent content)
    {
        ArgumentNullException.ThrowIfNull(content);
        Content = content;
        UpdatedAt = DateTime.UtcNow;
    }
}
