using ShuKnow.Application.Models.Notifications;
using ShuKnow.Domain.Entities;
using ShuKnow.WebAPI.Dto.Auth;
using ShuKnow.WebAPI.Dto.Chat;
using ShuKnow.WebAPI.Dto.Files;
using ShuKnow.WebAPI.Dto.Folders;
using ShuKnow.WebAPI.Events;

namespace ShuKnow.WebAPI.Mappers;

public static class ModelToDtoMappers
{
    public static UserDto ToDto(this User user)
    {
        return new UserDto(user.Id, user.Login);
    }

    public static ChatMessageDto ToDto(this MessageCompletedNotification notification)
    {
        return new ChatMessageDto(
            notification.Id,
            (Dto.Enums.ChatMessageRole)notification.Role,
            notification.Content,
            notification.Index,
            null);
    }

    public static FileDto ToDto(this FileCreatedNotification notification)
    {
        return new FileDto(
            notification.FileId,
            notification.FolderId,
            notification.FolderName,
            notification.Name,
            notification.Description,
            notification.ContentType,
            notification.SizeBytes,
            notification.Version,
            notification.ChecksumSha256,
            notification.SortOrder,
            notification.CreatedAt);
    }

    public static FolderDto ToDto(this FolderCreatedNotification notification)
    {
        return new FolderDto(
            notification.FolderId,
            notification.Name,
            notification.Description,
            notification.Emoji,
            notification.ParentFolderId,
            notification.SortOrder,
            notification.FileCount,
            notification.HasChildren,
            null);
    }

    public static ClassificationDecisionDto ToDto(this ClassificationDecisionNotification notification)
    {
        return new ClassificationDecisionDto(
            notification.FileName,
            notification.TargetFolderName,
            notification.TargetFolderId,
            notification.IsNewFolder);
    }
}