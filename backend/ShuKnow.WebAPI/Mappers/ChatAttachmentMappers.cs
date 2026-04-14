using Microsoft.AspNetCore.Http;
using ShuKnow.Domain.Entities;
using ShuKnow.WebAPI.Dto.Chat;

namespace ShuKnow.WebAPI.Mappers;

public static class ChatAttachmentMappers
{
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
                Attachment: file.ToChatAttachment(userId),
                Content: file.OpenReadStream()))
            .ToList();
    }

    public static Task DisposeContentsAsync(
        this IEnumerable<(ChatAttachment Attachment, Stream Content)> uploads)
    {
        return Task.WhenAll(uploads.Select(upload => upload.Content.DisposeAsync().AsTask()));
    }

    private static ChatAttachment ToChatAttachment(this IFormFile file, Guid userId)
    {
        return new ChatAttachment(
            Guid.NewGuid(),
            userId,
            Guid.Empty,
            file.FileName,
            file.ContentType,
            file.Length);
    }
}
