using Microsoft.AspNetCore.Http;
using ShuKnow.Domain.Entities;
using ShuKnow.WebAPI.Dto.Auth;
using ShuKnow.WebAPI.Dto.Chat;
using ShuKnow.WebAPI.Dto.Files;
using ShuKnow.WebAPI.Dto.Folders;
using ShuKnow.WebAPI.Dto.Settings;
using ApiAiProvider = ShuKnow.WebAPI.Dto.Enums.AiProvider;
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

    public static CursorPagedChatMessageResult ToDto(
        this (IReadOnlyList<ChatMessage> Messages, string? NextCursor) page)
    {
        return new CursorPagedChatMessageResult(
            page.Messages.Select(message => message.ToDto()).ToList(),
            page.NextCursor,
            page.NextCursor is not null);
    }

    public static AttachmentDto ToDto(this ChatAttachment attachment)
    {
        return new AttachmentDto(
            attachment.Id,
            attachment.FileName,
            attachment.ContentType,
            attachment.SizeBytes);
    }

    public static IReadOnlyList<AttachmentDto> ToDto(this IReadOnlyList<ChatAttachment> attachments)
    {
        return attachments
            .Select(attachment => attachment.ToDto())
            .ToList();
    }

    public static IReadOnlyList<(ChatAttachment Attachment, Stream Content)> ToUploads(
        this IFormFileCollection files,
        Guid userId)
    {
        return files
            .Select(file => (
                Attachment: new ChatAttachment(
                    Guid.NewGuid(),
                    userId,
                    Guid.Empty,
                    file.FileName,
                    file.ContentType,
                    file.Length),
                Content: file.OpenReadStream()))
            .ToList();
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

    public static AiSettingsDto ToDto(this UserAiSettings settings)
    {
        return new AiSettingsDto(
            settings.BaseUrl,
            MaskApiKey(settings.ApiKeyEncrypted),
            (ApiAiProvider)settings.Provider,
            settings.ModelId,
            !string.IsNullOrWhiteSpace(settings.BaseUrl)
            && !string.IsNullOrWhiteSpace(settings.ApiKeyEncrypted)
            && settings.Provider != Domain.Enums.AiProvider.Unknown
            && !string.IsNullOrWhiteSpace(settings.ModelId));
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

    private static string MaskApiKey(string apiKey)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
            return string.Empty;

        return apiKey.Length > 4
            ? "****" + apiKey[^4..]
            : "****";
    }
}
