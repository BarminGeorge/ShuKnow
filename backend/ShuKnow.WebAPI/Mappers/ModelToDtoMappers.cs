using ShuKnow.Domain.Entities;
using ShuKnow.WebAPI.Dto.Auth;
using ShuKnow.WebAPI.Dto.Chat;
using ShuKnow.WebAPI.Dto.Files;
using ShuKnow.WebAPI.Dto.Folders;
using File = ShuKnow.Domain.Entities.File;

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

    public static FileDto ToDto(this File file, string folderName = "")
    {
        return new FileDto(
            file.Id,
            file.FolderId,
            folderName,
            file.Name,
            file.Description,
            file.ContentType,
            file.SizeBytes,
            file.Version,
            file.ChecksumSha256,
            file.SortOrder,
            file.CreatedAt);
    }

    public static FolderDto ToDto(this Folder folder)
    {
        return new FolderDto(
            folder.Id,
            folder.Name,
            folder.Description,
            folder.Emoji,
            folder.ParentFolderId,
            folder.SortOrder,
            0,
            false,
            null);
    }
}