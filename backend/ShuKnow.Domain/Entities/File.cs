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
        Name = name;
        Description = description;
        Content = content;
    }

    public Result Rename(string name)
    {
        Name = name;
        Touch();
        return Result.Success();
    }

    public Result UpdateContent(FileContent content)
    {
        Content = content;
        Touch();
        return Result.Success();
    }

    public void ChangeDescription(string description)
    {
        Description = description;
        Touch();
    }

    public Result UpdateContentAndDescription(FileContent content, string description)
    {   
        Content = content;
        Description = description;
        Touch();
        return Result.Success();
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
