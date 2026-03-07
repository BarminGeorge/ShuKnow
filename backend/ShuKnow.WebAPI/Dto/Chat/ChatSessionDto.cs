namespace ShuKnow.WebAPI.Dto.Chat;

public record ChatSessionDto(
    Guid Id,
    int MessageCount,
    bool CanRollback);
 