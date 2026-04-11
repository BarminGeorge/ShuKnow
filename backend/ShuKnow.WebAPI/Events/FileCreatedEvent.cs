namespace ShuKnow.WebAPI.Events;

/// <summary>
/// Event from server to client when a file is created.
/// </summary>
public record FileCreatedEvent(
    Guid FileId,
    string Name,
    string Description,
    string ContentType);
