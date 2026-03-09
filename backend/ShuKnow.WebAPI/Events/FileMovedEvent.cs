namespace ShuKnow.WebAPI.Events;

/// <summary>
/// Event from server to client when a file is moved.
/// </summary>
public record FileMovedEvent(
    Guid FileId,
    Guid FromFolderId,
    Guid ToFolderId);
