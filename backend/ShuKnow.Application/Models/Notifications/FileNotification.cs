using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Models.Notifications;

public record FileNotification(
    File Entity,
    string FolderName);
