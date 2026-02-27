using Ardalis.Result;
using ShuKnow.Domain.Abstractions;
using ShuKnow.Domain.Common;
using ShuKnow.Domain.Enums;
using ShuKnow.Domain.ValueObjects;

namespace ShuKnow.Domain.Entities;

public class ChatMessage : Entity<Guid>, IAggregateRoot
{
    private readonly List<Attachment> _attachments = new();

    public Guid SessionId { get; private set; }
    public Guid UserId { get; private set; }
    public ChatMessageRole Role { get; private set; }
    public string Text { get; private set; } = string.Empty;
    public IReadOnlyCollection<Attachment> Attachments => _attachments.AsReadOnly();
    public DateTimeOffset CreatedAtUtc { get; private set; }

    protected ChatMessage()
    {
    }

    private ChatMessage(
        Guid id,
        Guid sessionId,
        Guid userId,
        ChatMessageRole role,
        string text,
        IReadOnlyCollection<Attachment> attachments,
        DateTimeOffset createdAtUtc) : base(id)
    {
        SessionId = sessionId;
        UserId = userId;
        Role = role;
        Text = text;
        _attachments.AddRange(attachments);
        CreatedAtUtc = createdAtUtc;
    }

    public static Result<ChatMessage> Create(
        Guid id,
        Guid sessionId,
        Guid userId,
        ChatMessageRole role,
        string? text = null,
        IReadOnlyCollection<Attachment>? attachments = null,
        DateTimeOffset? createdAtUtc = null)
    {
        if (id == Guid.Empty)
            return DomainResult.Invalid<ChatMessage>(nameof(id), "Message id cannot be empty.");

        if (sessionId == Guid.Empty)
            return DomainResult.Invalid<ChatMessage>(nameof(sessionId), "Session id cannot be empty.");

        if (userId == Guid.Empty)
            return DomainResult.Invalid<ChatMessage>(nameof(userId), "User id cannot be empty.");

        if (!Enum.IsDefined(role))
            return DomainResult.Invalid<ChatMessage>(nameof(role), "Message role is invalid.");

        var normalizedText = text?.Trim() ?? string.Empty;
        var normalizedAttachments = attachments ?? Array.Empty<Attachment>();
        if (normalizedText.Length == 0 && normalizedAttachments.Count == 0)
            return DomainResult.Invalid<ChatMessage>(
                nameof(text),
                "Message must contain text or at least one attachment.");

        if (normalizedText.Length > DomainConstraints.ContentTextMaxLength)
            return DomainResult.Invalid<ChatMessage>(
                nameof(text),
                $"Message text cannot exceed {DomainConstraints.ContentTextMaxLength} characters.");

        var createdAt = createdAtUtc ?? DateTimeOffset.UtcNow;
        return Result.Success(
            new ChatMessage(id, sessionId, userId, role, normalizedText, normalizedAttachments, createdAt));
    }
}
