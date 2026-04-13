namespace ShuKnow.WebAPI.Events;

/// <summary>
/// Event from server to client when text is appended to a file.
/// </summary>
public record TextAppendedEvent(
    Guid FileId,
    string Text);
