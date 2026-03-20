using ShuKnow.WebAPI.Dto.Enums;

namespace ShuKnow.WebAPI.Dto.Chat;

public record ChatMessageDto(
    Guid Id,
    ChatMessageRole Role,
    string Content,
    int? Index,
    IReadOnlyList<AttachmentDto>? Attachments);
