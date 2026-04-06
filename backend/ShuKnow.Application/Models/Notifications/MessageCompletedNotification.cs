using ShuKnow.Domain.Enums;

namespace ShuKnow.Application.Models.Notifications;

public record MessageCompletedNotification(
    Guid Id,
    ChatMessageRole Role,
    string Content,
    int? Index);
