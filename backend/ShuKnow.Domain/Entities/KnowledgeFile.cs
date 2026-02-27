using Ardalis.Result;
using ShuKnow.Domain.Abstractions;
using ShuKnow.Domain.Common;
using ShuKnow.Domain.ValueObjects;

namespace ShuKnow.Domain.Entities;

public class KnowledgeFile : Entity<Guid>, IAggregateRoot
{
    public Guid UserId { get; private set; }
    public Guid FolderId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public FileContent Content { get; private set; } = null!;

    protected KnowledgeFile()
    {
    }

    private KnowledgeFile(
        Guid id,
        Guid userId,
        Guid folderId,
        string name,
        FileContent content) : base(id)
    {
        UserId = userId;
        FolderId = folderId;
        Name = name;
        Content = content;
    }

    public static Result<KnowledgeFile> Create(
        Guid id,
        Guid userId,
        Guid folderId,
        string name,
        FileContent content)
    {
        if (id == Guid.Empty)
            return DomainResult.Invalid<KnowledgeFile>(nameof(id), "File id cannot be empty.");

        if (userId == Guid.Empty)
            return DomainResult.Invalid<KnowledgeFile>(nameof(userId), "File user id cannot be empty.");

        if (folderId == Guid.Empty)
            return DomainResult.Invalid<KnowledgeFile>(nameof(folderId), "Folder id cannot be empty.");

        if (content is null)
            return DomainResult.Invalid<KnowledgeFile>(nameof(content), "File content is required.");

        var normalizedName = NormalizeName(name);
        if (normalizedName is null)
            return DomainResult.Invalid<KnowledgeFile>(nameof(name), "File name is required.");

        if (normalizedName.Length > DomainConstraints.FileNameMaxLength)
            return DomainResult.Invalid<KnowledgeFile>(
                nameof(name),
                $"File name cannot exceed {DomainConstraints.FileNameMaxLength} characters.");

        return Result.Success(new KnowledgeFile(id, userId, folderId, normalizedName, content));
    }

    public Result Rename(string name)
    {
        var normalizedName = NormalizeName(name);
        if (normalizedName is null)
            return DomainResult.Invalid(nameof(name), "File name is required.");

        if (normalizedName.Length > DomainConstraints.FileNameMaxLength)
            return DomainResult.Invalid(
                nameof(name),
                $"File name cannot exceed {DomainConstraints.FileNameMaxLength} characters.");

        Name = normalizedName;
        return Result.Success();
    }

    public Result MoveToFolder(Guid folderId)
    {
        if (folderId == Guid.Empty)
            return DomainResult.Invalid(nameof(folderId), "Folder id cannot be empty.");

        FolderId = folderId;
        return Result.Success();
    }

    public Result UpdateContent(FileContent content)
    {
        if (content is null)
            return DomainResult.Invalid(nameof(content), "File content is required.");

        Content = content;
        return Result.Success();
    }

    public Result EnsureOwnedBy(Guid userId)
    {
        if (userId == Guid.Empty)
            return DomainResult.Invalid(nameof(userId), "User id cannot be empty.");

        return userId == UserId
            ? Result.Success()
            : Result.Forbidden("File does not belong to the requested user.");
    }

    private static string? NormalizeName(string name)
    {
        return string.IsNullOrWhiteSpace(name) ? null : name.Trim();
    }
}
