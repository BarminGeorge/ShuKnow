using ShuKnow.WebAPI.Dto.Enums;

namespace ShuKnow.WebAPI.Dto.Chat;

public record ChatSessionDto(
    Guid Id,
    ChatSessionStatus Status,
    int MessageCount,
    bool CanRollback);
