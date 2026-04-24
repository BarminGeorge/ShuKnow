using System.Text.Json.Serialization;

namespace ShuKnow.WebAPI.Events;

/// <summary>
/// Command from client to server for sending a message to the AI.
/// </summary>
public class SendMessageCommand
{
    public Guid SessionId { get; init; }
    public string Content { get; init; }
    public string? Context { get; init; }
    public IReadOnlyList<Guid>? AttachmentIds { get; init; }

    [JsonConstructor]
    public SendMessageCommand(
        Guid SessionId,
        string Content,
        string? Context = null,
        IReadOnlyList<Guid>? AttachmentIds = null)
    {
        this.SessionId = SessionId;
        this.Content = Content;
        this.Context = Context;
        this.AttachmentIds = AttachmentIds;
    }

    [Obsolete("Use the constructor that includes SessionId.")]
    public SendMessageCommand(
        string Content,
        string? Context = null,
        IReadOnlyList<Guid>? AttachmentIds = null)
        : this(Guid.Empty, Content, Context, AttachmentIds)
    {
    }
}
