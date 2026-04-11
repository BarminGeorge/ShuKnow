using ShuKnow.Domain.Entities;
using FileEntity = ShuKnow.Domain.Entities.File;
using ShuKnow.WebAPI.Events;

namespace ShuKnow.WebAPI.Mappers;

public static class ModelToEventMappers
{
    public static FileCreatedEvent ToFileCreatedEvent(this FileEntity file)
    {
        return new FileCreatedEvent(
            file.Id,
            file.FolderId,
            file.Name,
            file.Description,
            file.ContentType,
            file.SizeBytes,
            file.Version,
            file.ChecksumSha256,
            file.SortOrder,
            file.CreatedAt);
    }

    public static FileMovedEvent ToFileMovedEvent(this FileEntity file, Guid fromFolderId)
    {
        return new FileMovedEvent(
            file.Id,
            file.Name,
            fromFolderId,
            file.FolderId,
            file.Version);
    }

    public static FolderCreatedEvent ToFolderCreatedEvent(this Folder folder)
    {
        return new FolderCreatedEvent(
            folder.Id,
            folder.Name,
            folder.Description,
            folder.Emoji,
            folder.ParentFolderId,
            folder.SortOrder);
    }

    public static TextAppendedEvent ToTextAppendedEvent(this FileEntity file, string text)
    {
        return new TextAppendedEvent(
            file.Id,
            text,
            file.Version);
    }

    public static TextPrependedEvent ToTextPrependedEvent(this FileEntity file, string text)
    {
        return new TextPrependedEvent(
            file.Id,
            text,
            file.Version);
    }

    public static AttachmentSavedEvent ToAttachmentSavedEvent(this ChatAttachment attachment)
    {
        return new AttachmentSavedEvent(
            attachment.Id,
            attachment.FileName,
            attachment.ContentType,
            attachment.SizeBytes);
    }
}
