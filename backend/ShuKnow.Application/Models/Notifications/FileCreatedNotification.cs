namespace ShuKnow.Application.Models.Notifications;

public record FileCreatedNotification(
    Guid FileId,
    Guid FolderId,
    string FolderName,
    string Name,
    string Description,
    string ContentType,
    long SizeBytes,
    int Version,
    string? ChecksumSha256,
    int SortOrder,
    DateTimeOffset CreatedAt);
