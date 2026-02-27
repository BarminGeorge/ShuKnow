using ShuKnow.Domain.Interfaces;
using ShuKnow.Domain.VO;

namespace ShuKnow.Domain.Entities;

public class File : IEntity<Guid>
{
    public Guid FileId { get; private set; }
    public Guid Id => FileId;

    public Guid FolderId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public FileContent Content { get; private set; } = null!;
    public DateTimeOffset CreatedAt { get; private set; }
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
        ValidateFileId(fileId);
        ValidateFolderId(folderId);
        ArgumentNullException.ThrowIfNull(content);
        ValidateName(name);
        ValidateDescription(description);

        FileId = fileId;
        FolderId = folderId;
        Name = name.Trim();
        Description = description.Trim();
        Content = content;

        CreatedAt = createdAt ?? DateTimeOffset.UtcNow;
        UpdatedAt = CreatedAt;
    }

    public void Rename(string name)
    {
        ValidateName(name);
        Name = name.Trim();
        Touch();
    }

    public void UpdateContent(FileContent content)
    {
        ArgumentNullException.ThrowIfNull(content);
        Content = content;
        Touch();
    }

    public void ChangeDescription(string description)
    {
        ValidateDescription(description);
        Description = description.Trim();
        Touch();
    }

    public void UpdateContentAndDescription(FileContent content, string description)
    {
        ArgumentNullException.ThrowIfNull(content);
        ValidateDescription(description);

        Content = content;
        Description = description.Trim();
        Touch();
    }

    public void MoveToFolder(Guid folderId)
    {
        ValidateFolderId(folderId);
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

    private static void ValidateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("File name cannot be empty.", nameof(name));
        }
    }

    private static void ValidateDescription(string description)
    {
        if (string.IsNullOrWhiteSpace(description))
        {
            throw new ArgumentException("File description cannot be empty.", nameof(description));
        }
    }

    private static void ValidateFileId(Guid fileId)
    {
        if (fileId == Guid.Empty)
        {
            throw new ArgumentException("File id cannot be empty.", nameof(fileId));
        }
    }

    private static void ValidateFolderId(Guid folderId)
    {
        if (folderId == Guid.Empty)
        {
            throw new ArgumentException("Folder id cannot be empty.", nameof(folderId));
        }
    }
}
