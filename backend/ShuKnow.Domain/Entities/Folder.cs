using Ardalis.Result;
using ShuKnow.Domain.Abstractions;
using ShuKnow.Domain.Common;

namespace ShuKnow.Domain.Entities;

public class Folder : Entity<Guid>, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public Guid? ParentFolderId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public int OrderIndex { get; private set; }
    public string? IconImagePath { get; private set; }

    protected Folder()
    {
    }

    private Folder(
        Guid id,
        Guid userId,
        string name,
        string description,
        Guid? parentFolderId,
        int orderIndex,
        string? iconImagePath) : base(id)
    {
        UserId = userId;
        Name = name;
        Description = description;
        ParentFolderId = parentFolderId;
        OrderIndex = orderIndex;
        IconImagePath = iconImagePath;
    }

    public static Result<Folder> Create(
        Guid id,
        Guid userId,
        string name,
        string description,
        Guid? parentFolderId = null,
        int orderIndex = 0,
        string? iconImagePath = null)
    {
        if (id == Guid.Empty)
            return DomainResult.Invalid<Folder>(nameof(id), "Folder id cannot be empty.");

        if (userId == Guid.Empty)
            return DomainResult.Invalid<Folder>(nameof(userId), "Folder user id cannot be empty.");

        var normalizedName = NormalizeName(name);
        if (normalizedName is null)
            return DomainResult.Invalid<Folder>(nameof(name), "Folder name is required.");

        if (normalizedName.Length > DomainConstraints.NameMaxLength)
            return DomainResult.Invalid<Folder>(
                nameof(name),
                $"Folder name cannot exceed {DomainConstraints.NameMaxLength} characters.");

        var normalizedDescription = NormalizeDescription(description);
        if (normalizedDescription.Length > DomainConstraints.DescriptionMaxLength)
            return DomainResult.Invalid<Folder>(
                nameof(description),
                $"Folder description cannot exceed {DomainConstraints.DescriptionMaxLength} characters.");

        if (parentFolderId == id)
            return DomainResult.Invalid<Folder>(
                nameof(parentFolderId),
                "Folder cannot be a child of itself.");

        if (orderIndex < 0)
            return DomainResult.Invalid<Folder>(nameof(orderIndex), "Order index cannot be negative.");

        var normalizedIconPath = NormalizeIconPath(iconImagePath);
        if (normalizedIconPath is not null && normalizedIconPath.Length > DomainConstraints.IconPathMaxLength)
            return DomainResult.Invalid<Folder>(
                nameof(iconImagePath),
                $"Icon path cannot exceed {DomainConstraints.IconPathMaxLength} characters.");

        return Result.Success(
            new Folder(
                id,
                userId,
                normalizedName,
                normalizedDescription,
                parentFolderId,
                orderIndex,
                normalizedIconPath));
    }

    public Result Rename(string name)
    {
        var normalizedName = NormalizeName(name);
        if (normalizedName is null)
            return DomainResult.Invalid(nameof(name), "Folder name is required.");

        if (normalizedName.Length > DomainConstraints.NameMaxLength)
            return DomainResult.Invalid(
                nameof(name),
                $"Folder name cannot exceed {DomainConstraints.NameMaxLength} characters.");

        Name = normalizedName;
        return Result.Success();
    }

    public Result ChangeDescription(string description)
    {
        var normalizedDescription = NormalizeDescription(description);
        if (normalizedDescription.Length > DomainConstraints.DescriptionMaxLength)
            return DomainResult.Invalid(
                nameof(description),
                $"Folder description cannot exceed {DomainConstraints.DescriptionMaxLength} characters.");

        Description = normalizedDescription;
        return Result.Success();
    }

    public Result ChangeIcon(string? iconImagePath)
    {
        var normalizedIconPath = NormalizeIconPath(iconImagePath);
        if (normalizedIconPath is not null && normalizedIconPath.Length > DomainConstraints.IconPathMaxLength)
            return DomainResult.Invalid(
                nameof(iconImagePath),
                $"Icon path cannot exceed {DomainConstraints.IconPathMaxLength} characters.");

        IconImagePath = normalizedIconPath;
        return Result.Success();
    }

    public Result MoveToParent(Guid? parentFolderId)
    {
        if (parentFolderId == Id)
            return DomainResult.Invalid(nameof(parentFolderId), "Folder cannot be a child of itself.");

        ParentFolderId = parentFolderId;
        return Result.Success();
    }

    public Result ChangeOrderIndex(int orderIndex)
    {
        if (orderIndex < 0)
            return DomainResult.Invalid(nameof(orderIndex), "Order index cannot be negative.");

        OrderIndex = orderIndex;
        return Result.Success();
    }

    public Result EnsureOwnedBy(Guid userId)
    {
        if (userId == Guid.Empty)
            return DomainResult.Invalid(nameof(userId), "User id cannot be empty.");

        return userId == UserId
            ? Result.Success()
            : Result.Forbidden("Folder does not belong to the requested user.");
    }

    private static string? NormalizeName(string name)
    {
        return string.IsNullOrWhiteSpace(name) ? null : name.Trim();
    }

    private static string NormalizeDescription(string description)
    {
        return description?.Trim() ?? string.Empty;
    }

    private static string? NormalizeIconPath(string? iconImagePath)
    {
        return string.IsNullOrWhiteSpace(iconImagePath) ? null : iconImagePath.Trim();
    }
}
