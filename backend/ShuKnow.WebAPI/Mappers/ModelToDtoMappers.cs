using ShuKnow.Domain.Entities;
using ShuKnow.WebAPI.Dto.Auth;
using ShuKnow.WebAPI.Dto.Chat;
using ShuKnow.WebAPI.Dto.Files;
using ShuKnow.WebAPI.Dto.Folders;
using ApiChatMessageRole = ShuKnow.WebAPI.Dto.Enums.ChatMessageRole;
using ApiChatSessionStatus = ShuKnow.WebAPI.Dto.Enums.ChatSessionStatus;
using DomainFile = ShuKnow.Domain.Entities.File;

namespace ShuKnow.WebAPI.Mappers;

public static class ModelToDtoMappers
{
    public static UserDto ToDto(this User user)
    {
        return new UserDto(user.Id, user.Login);
    }

    public static ChatSessionDto ToDto(this ChatSession session)
    {
        return new ChatSessionDto(
            session.Id,
            (ApiChatSessionStatus)session.Status,
            0,
            false);
    }

    public static ChatMessageDto ToDto(this ChatMessage message)
    {
        return new ChatMessageDto(
            message.Id,
            (ApiChatMessageRole)message.Role,
            message.Content,
            message.Index,
            null);
    }

    public static FileDto ToDto(this DomainFile file)
    {
        return new FileDto(
            file.Id,
            file.FolderId,
            file.Folder?.Name,
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

    public static IReadOnlyList<FolderTreeNodeDto> ToTree(this IReadOnlyList<Folder> folders)
    {
        var foldersByParentId = folders.ToLookup(folder => folder.ParentFolderId);
        return foldersByParentId[null]
            .Select(folder => folder.ToTreeNode(foldersByParentId))
            .ToList();
    }

    private static FolderTreeNodeDto ToTreeNode(this Folder folder, ILookup<Guid?, Folder> foldersByParentId)
    {
        var children = foldersByParentId[folder.Id]
            .Select(child => child.ToTreeNode(foldersByParentId))
            .ToList();

        return new FolderTreeNodeDto(
            folder.Id,
            folder.Name,
            folder.Description,
            folder.Emoji,
            folder.SortOrder,
            0,
            children);
    }
}
