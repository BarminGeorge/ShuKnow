using Ardalis.Result;
using LlmTornado.Chat;
using ShuKnow.Application.Interfaces;
using ShuKnow.Infrastructure.Extensions;

namespace ShuKnow.Infrastructure.Services;

public class TornadoPromptBuilder(
    IAttachmentService attachmentService,
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
            .MapAsync(attachments =>
            {
                foreach (var attachment in attachments)
                {
                    messageParts.Add(new ChatMessagePart($"File: `{attachment.FileName}`"));
                    // TODO: add blob (after rebase on main)
                }

                return messageParts;
            });
    }
}