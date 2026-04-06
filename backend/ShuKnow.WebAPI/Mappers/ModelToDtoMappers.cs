using ShuKnow.Application.Models.Notifications;
using ShuKnow.Domain.Entities;
using ShuKnow.WebAPI.Dto.Auth;
using ShuKnow.WebAPI.Dto.Chat;
using ShuKnow.WebAPI.Dto.Files;
using ShuKnow.WebAPI.Dto.Folders;

namespace ShuKnow.WebAPI.Mappers;

public static class ModelToDtoMappers
{
    public static UserDto ToDto(this User user)
    {
        return new UserDto(user.Id, user.Login);
    }

    public static ChatMessageDto ToDto(this ChatMessage message)
    {
        return new ChatMessageDto(
            message.Id,
            (Dto.Enums.ChatMessageRole)message.Role,
            message.Content,
            message.Index,
            null);
    }

    public static FileDto ToDto(this FileNotification notification)
    {
        return new FileDto(
            notification.Entity.Id,
            notification.Entity.FolderId,
            notification.FolderName,
            notification.Entity.Name,
            notification.Entity.Description,
            notification.Entity.ContentType,
            notification.Entity.SizeBytes,
            notification.Entity.Version,
            notification.Entity.ChecksumSha256,
            notification.Entity.SortOrder,
            notification.Entity.CreatedAt);
    }

    public static FolderDto ToDto(this FolderNotification notification)
    {
        return new FolderDto(
            notification.Entity.Id,
            notification.Entity.Name,
            notification.Entity.Description,
            notification.Entity.Emoji,
            notification.Entity.ParentFolderId,
            notification.Entity.SortOrder,
            notification.FileCount,
            notification.HasChildren,
            null);
    }
}