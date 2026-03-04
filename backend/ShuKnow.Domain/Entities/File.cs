using ShuKnow.Domain.Interfaces;
using ShuKnow.Domain.VO;
using Ardalis.Result;

namespace ShuKnow.Domain.Entities;

public class File : IEntity<Guid>
{
    public Guid Id { get; }

    public Guid FolderId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public FileContent Content { get; private set; } = null!;
    public DateTimeOffset UpdatedAt { get; private set; }

    protected File()
    {
    }

    public File(
        Guid fileId,
        Guid folderId,
        string name,
        string description,
        FileContent content,
        DateTimeOffset? createdAt = null)
    {
        Id = fileId;
        FolderId = folderId;
        Name = name.Trim();
        Description = description.Trim();
        Content = content;
    }

    public void Rename(string name)
    {
        
    }

    public void UpdateContent(FileContent content)
    {
        ArgumentNullException.ThrowIfNull(content);
        Content = content;
        Touch();
    }

    public void ChangeDescription(string description)
    {
        Description = description.Trim();
        Touch();
    }

    public void UpdateContentAndDescription(FileContent content, string description)
    {
        Content = content;
        Description = description.Trim();
        Touch();
    }

    public void MoveToFolder(Guid folderId)
    {
        if (FolderId == folderId)
        {
            return;
        }

        FolderId = folderId;
        Touch();
    }

    private void Touch()
    {
        UpdatedAt = DateTimeOffset.UtcNow;
    }

}
