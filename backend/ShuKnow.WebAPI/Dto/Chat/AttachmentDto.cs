namespace ShuKnow.WebAPI.Dto.Chat;

public record AttachmentDto(
    Guid Id,
    string FileName,
    string ContentType,
    long SizeBytes);
