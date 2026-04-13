namespace ShuKnow.WebAPI.Events;

/// <summary>
/// Event from server to client when an attachment is saved and ready for processing.
/// </summary>
public record AttachmentSavedEvent(
    Guid AttachmentId,
    string FileName,
    string ContentType,
    long SizeBytes);
