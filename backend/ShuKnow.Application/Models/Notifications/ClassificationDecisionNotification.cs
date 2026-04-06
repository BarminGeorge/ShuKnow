namespace ShuKnow.Application.Models.Notifications;

public record ClassificationDecisionNotification(
    string FileName,
    string TargetFolderName,
    Guid? TargetFolderId,
    bool IsNewFolder);
