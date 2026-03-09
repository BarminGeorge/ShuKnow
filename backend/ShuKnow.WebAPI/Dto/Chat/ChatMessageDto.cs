using System.Text.Json.Serialization;

namespace ShuKnow.WebAPI.Dto.Chat;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ChatMessageRole
{
    User,
    Ai
}

public record ChatMessageDto(
    Guid Id,
    ChatMessageRole Role,
    string Content,
    IReadOnlyList<AttachmentDto>? Attachments);
