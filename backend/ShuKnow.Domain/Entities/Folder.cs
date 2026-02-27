using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

    
public class Folder : IEntity<Guid>
{
    public Guid FolderId { get; private set; }
    public Guid Id => FolderId;

    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public Guid? ParentFolderId { get; private set; }

    protected Folder()
    {
    }

    public Folder(Guid folderId, Guid userId, string name, string description, Guid? parentFolderId = null)
    {
        ValidateName(name);
        ValidateDescription(description);

        FolderId = folderId;
        UserId = userId;
        Name = name.Trim();
        Description = description.Trim();
        ParentFolderId = parentFolderId;
    }

    public void Rename(string name)
    {
        ValidateName(name);
        Name = name.Trim();
    }

    public void ChangeDescription(string description)
    {
        ValidateDescription(description);
        Description = description.Trim();
    }

    public void MoveTo(Guid? newParentFolderId, Func<Guid, Guid?> parentFolderResolver)
    {
        if (newParentFolderId is null)
        {
            ParentFolderId = null;
            return;
        }

        ArgumentNullException.ThrowIfNull(parentFolderResolver);

        if (newParentFolderId == FolderId)
        {
            throw new InvalidOperationException("A folder cannot be moved into itself.");
        }

        var visitedFolderIds = new HashSet<Guid> { FolderId };
        var currentParentId = newParentFolderId;

        while (currentParentId is not null)
        {
            var parentId = currentParentId.Value;

            if (!visitedFolderIds.Add(parentId))
            {
                throw new InvalidOperationException("Moving folder would create a cycle.");
            }

            currentParentId = parentFolderResolver(parentId);
        }

        ParentFolderId = newParentFolderId;
    }

    private static void ValidateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Folder name cannot be empty.", nameof(name));
        }
    }
    
    //Нужна ли проверка описания ? 
    private static void ValidateDescription(string description)
    {
        if (description is null)
        {
            throw new ArgumentNullException(nameof(description));
        }
    }
}
