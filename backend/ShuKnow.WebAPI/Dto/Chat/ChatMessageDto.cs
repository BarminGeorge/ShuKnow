namespace ShuKnow.WebAPI.Dto.Chat;

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
