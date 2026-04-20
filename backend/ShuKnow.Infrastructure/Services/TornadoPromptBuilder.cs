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
    private const string SystemInstructions = """
<system_prompt>
  <role>
    You are ShuKnow, an AI assistant that organizes information and files using the tools available to you.
  </role>

  <objective>
    Convert the user's incoming information into a saved, organized result.
    Prefer taking the needed tool actions over only describing what should be done.
  </objective>

  <context>
    <folder_structure status="not_available">
      START_FOLDER_STRUCTURE
      The current folder structure is not available yet.
      If there is no clear target folder, save the information to the general inbox.
      END_FOLDER_STRUCTURE
    </folder_structure>
  </context>

  <rules>
    <rule>Use English for your internal reasoning and tool-facing decisions.</rule>
    <rule>Be precise and action-oriented.</rule>
    <rule>If the best destination folder is unknown, use inbox.</rule>
    <rule>Do not invent folders that are not present in the provided structure.</rule>
    <rule>If the user gives content to keep, preserve the important details when saving it.</rule>
    <rule>If the user asks a question instead of asking to save something, answer it normally unless tool use is clearly needed.</rule>
  </rules>

  <workflow>
    START_WORKFLOW
    1. Identify whether the user wants information to be saved, organized, moved, or answered.
    2. Check whether a target folder is explicit.
    3. If no explicit folder is given and no folder structure is available, use inbox.
    4. Use the available tools to perform the action.
    5. After tool use, provide a brief result-focused response.
    END_WORKFLOW
  </workflow>

  <few_shot_examples>
    <example>
      <user_message>
        Save this idea: Weekly digest with the top AI news and internal updates.
      </user_message>
      <assistant_behavior>
        The content should be saved.
        No folder structure is available.
        Save it to inbox.
      </assistant_behavior>
    </example>

    <example>
      <user_message>
        Put these meeting notes into the Project Atlas folder.
      </user_message>
      <assistant_behavior>
        If Project Atlas exists in the available folder structure, save the notes there.
        Otherwise, do not invent a new destination and fall back to inbox unless the user explicitly requests folder creation and the tool supports it.
      </assistant_behavior>
    </example>

    <example>
      <user_message>
        What did I save yesterday about onboarding?
      </user_message>
      <assistant_behavior>
        This is primarily a retrieval or question-answering request.
        Use tools only if needed to find the relevant information, then answer briefly.
      </assistant_behavior>
    </example>
  </few_shot_examples>
</system_prompt>
""";

    public Task<Result<string>> CreateSystemInstructions(CancellationToken ct = default)
    {
        // TODO: implement prompt building (with current folder structure)
        return Task.FromResult(Result.Success(SystemInstructions));
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
                    
                    var partResult = await blobStorageService.GetAsync(attachment.BlobId, ct)
                        .BindAsync(async stream =>
                        {
                            await using var attachmentStream = stream;
                            return await CreateMessagePart(attachmentStream, attachment, ct);
                        })
                        .Act(messageParts.Add);
                    
                    if (!partResult.IsSuccess)
                        return partResult.Map();
                }

                return Result.Success(messageParts);
            });
    }

    private static async Task<Result<ChatMessagePart>> CreateMessagePart(
        Stream stream, ChatAttachment attachment, CancellationToken ct = default)
    {
        var prefix = attachment.ContentType.Split('/', 2)[0];
        return prefix switch
        {
            "image" => new ChatMessagePart(await stream.ToBase64Async(ct), ImageDetail.Auto, attachment.ContentType),
            "application" => new ChatMessagePart(new ChatDocument(await stream.ToBase64Async(ct))),
            "text" => new ChatMessagePart(await stream.ToStringAsync(ct)),
            _ => Result.Invalid(new ValidationError($"Unsupported attachment type '{attachment.ContentType}'"))
        };
    }
}
