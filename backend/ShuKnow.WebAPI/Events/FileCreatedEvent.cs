namespace ShuKnow.WebAPI.Events;

/// <summary>
/// Event from server to client when a file is created.
/// </summary>
public record FileCreatedEvent(
    Guid FileId,
    Guid FolderId,
    string Name,
    string Description,
    string ContentType,
    long SizeBytes,
    int Version,
    string? ChecksumSha256,
    int SortOrder,
    DateTimeOffset CreatedAt);
