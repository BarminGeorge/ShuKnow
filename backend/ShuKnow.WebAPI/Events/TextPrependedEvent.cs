namespace ShuKnow.WebAPI.Events;

/// <summary>
/// Event from server to client when text is prepended to a file.
/// </summary>
public record TextPrependedEvent(
    Guid FileId,
    string Text,
    int Version);
