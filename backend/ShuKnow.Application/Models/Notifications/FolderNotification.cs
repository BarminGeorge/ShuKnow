using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Models.Notifications;

public record FolderNotification(
    Folder Entity,
    int FileCount,
    bool HasChildren);
