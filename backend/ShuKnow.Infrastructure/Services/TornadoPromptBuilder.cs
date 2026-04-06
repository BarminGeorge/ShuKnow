using Ardalis.Result;
using LlmTornado.Chat;
using LlmTornado.Code;
using LlmTornado.Images;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.Infrastructure.Extensions;
using ShuKnow.Infrastructure.Misc;
using ChatMessage = LlmTornado.Chat.ChatMessage;

namespace ShuKnow.Infrastructure.Services;

public class TornadoPromptBuilder(
    IAttachmentService attachmentService,
    IBlobStorageService blobStorageService,
    IChatService chatService)
{
    public async Task<Result<string>> CreateSystemInstructions(CancellationToken ct = default)
    {
        // TODO: implement prompt building (with current folder structure)
        return Result.Success("Ты - помощник с файлами и информацией. Используя выданные тебе tools, сохрани переданную тебе информацию");
    }

    public async Task<Result<IEnumerable<ChatMessage>>> GetPreviousMessages(CancellationToken ct = default)
    {   
        return await chatService.GetMessagesAsync(ct)
            .MapAsync(messages => messages
                .Select(message => message.MapToChatMessagePart()));
    }

    public async Task<Result<List<ChatMessagePart>>> CreateUserMessages(
        string content, IReadOnlyCollection<Guid>? attachmentIds, CancellationToken ct = default)
    {
        var messageParts = new List<ChatMessagePart> { new(content) };
        if (attachmentIds is null || attachmentIds.Count == 0)
            return Result.Success(messageParts);

        return await attachmentService.GetByIdsAsync(attachmentIds, ct)
            .BindAsync(async attachments =>
            {
                foreach (var attachment in attachments)
                {
                    messageParts.Add(new ChatMessagePart(
                        $"Attachment: `{attachment.FileName}` ({attachment.ContentType})"));
                    
                    var partResult = await blobStorageService.GetAsync(attachment.BlobId, ct).ToBase64Async(ct)
                        .BindAsync(base64 => CreateMessagePart(base64, attachment))
                        .Act(part => messageParts.Add(part));
                    
                    if (!partResult.IsSuccess)
                        return partResult.Map();
                }

                return Result.Success(messageParts);
            });
    }

    private static Result<ChatMessagePart> CreateMessagePart(string base64Data, ChatAttachment attachment)
    {
        var prefix = attachment.ContentType.Split('/', 2)[0];
        return prefix switch
        {
            "image" => new ChatMessagePart(base64Data, ImageDetail.Auto, attachment.ContentType),
            "audio" => attachment.ContentType.MapToAudioFormat()
                .Map(audioFormat => new ChatMessagePart(base64Data, audioFormat)),
            _ => new ChatMessagePart(new ChatDocument(base64Data))
        };
    }
}
