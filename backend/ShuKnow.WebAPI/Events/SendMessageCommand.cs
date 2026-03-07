namespace ShuKnow.WebAPI.Events;

/// <summary>
/// Command from client to server for sending a message to the AI.
/// </summary>
public record SendMessageCommand(
    string Content,
    string? Context = null,
    IReadOnlyList<Guid>? AttachmentIds = null);
