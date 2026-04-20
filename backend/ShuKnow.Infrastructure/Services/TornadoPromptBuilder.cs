using System.Security;
using System.Text;
using Ardalis.Result;
using LlmTornado.Chat;
using LlmTornado.Code;
using LlmTornado.Images;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;
using ShuKnow.Domain.Entities;
using ShuKnow.Infrastructure.Extensions;
using ShuKnow.Infrastructure.Misc;
using ChatMessage = LlmTornado.Chat.ChatMessage;

namespace ShuKnow.Infrastructure.Services;

public class TornadoPromptBuilder(
    IFolderService folderService,
    IAttachmentService attachmentService,
    IBlobStorageService blobStorageService,
    IChatService chatService)
{
    private const string SystemInstructionsTemplate = """
<system_prompt>
  <role>
    You are ShuKnow, an AI assistant that organizes information and files using the tools available to you.
  </role>

  <objective>
    Convert the user's incoming information into a saved, organized result.
    Prefer taking the needed tool actions over only describing what should be done.
  </objective>

  <context>
    <folder_structure status="dynamic_user_defined">
      START_FOLDER_STRUCTURE
{FOLDER_STRUCTURE}
      END_FOLDER_STRUCTURE
    </folder_structure>
  </context>

  <rules>
    <rule>Use English for your internal reasoning and tool-facing decisions.</rule>
    <rule>Be precise and action-oriented.</rule>
    <rule>Respect folder-specific instructions entered by the user when such folders are available.</rule>
    <rule>In the current data model, a folder description is the folder's system instruction.</rule>
    <rule>If no folders exist, save the content to inbox.</rule>
    <rule>If folders exist but the best destination is unknown, use inbox.</rule>
    <rule>Do not invent folders that are not present in the provided structure.</rule>
    <rule>If the user gives content to keep, preserve the important details when saving it.</rule>
    <rule>If the user asks a question instead of asking to save something, answer it normally unless tool use is clearly needed.</rule>
  </rules>

  <workflow>
    START_WORKFLOW
    1. Identify whether the user wants information to be saved, organized, moved, or answered.
    2. Check whether the user explicitly named a folder.
    3. If folders are available, choose the best matching folder by its name and system instruction.
    4. If no folders exist, or no available folder is a clear match, use inbox.
    5. Use the available tools to perform the action.
    6. After tool use, provide a brief result-focused response.
    END_WORKFLOW
  </workflow>

  <few_shot_examples>
    <example>
      <user_message>
        Save this idea: Weekly digest with the top AI news and internal updates.
      </user_message>
      <assistant_behavior>
        The content should be saved.
        No user folder is available.
        Save it to inbox.
      </assistant_behavior>
    </example>

    <example>
      <user_message>
        Put these meeting notes into the Project Atlas folder.
      </user_message>
      <assistant_behavior>
        If Project Atlas exists in the available folder structure, save the notes there.
        If that folder has a description, treat it as the folder's system instruction and follow it.
        Otherwise, do not invent a new destination and save the notes to inbox.
      </assistant_behavior>
    </example>

    <example>
      <user_message>
        Save this receipt for later.
      </user_message>
      <assistant_behavior>
        The content should be saved.
        If no folders exist yet, save it to inbox.
        If folders exist but none clearly match receipts, still save it to inbox.
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
        return folderService.GetFolderTreeForPromptAsync(ct)
            .MapAsync(folders => SystemInstructionsTemplate.Replace("{FOLDER_STRUCTURE}", BuildFolderStructure(folders)));
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

    private static string BuildFolderStructure(IReadOnlyList<FolderSummary> folders)
    {
        var builder = new StringBuilder()
            .AppendLine("      Users may create their own folders.")
            .AppendLine("      Each folder may include its own system instructions entered by the user.")
            .AppendLine("      In the current data model, these instructions are represented by the folder description.")
            .AppendLine("      Some users may choose not to create any folders at all.")
            .AppendLine("      When no folders exist, the default destination is the general inbox.")
            .AppendLine("      <inbox>")
            .AppendLine("        <path>inbox</path>")
            .AppendLine("        <description>Default destination for content when no clear folder match exists.</description>")
            .AppendLine("      </inbox>");

        if (folders.Count == 0)
        {
            builder.Append("      <folders empty=\"true\" />");
            return builder.ToString();
        }

        builder.AppendLine("      <folders>");
        AppendFolders(builder, folders.ToLookup(folder => folder.ParentFolderId), parentFolderId: null, parentPath: null, indentLevel: 4);
        builder.Append("      </folders>");
        return builder.ToString();
    }

    private static void AppendFolders(
        StringBuilder builder,
        ILookup<Guid?, FolderSummary> foldersByParentId,
        Guid? parentFolderId,
        string? parentPath,
        int indentLevel)
    {
        foreach (var folder in foldersByParentId[parentFolderId].OrderBy(folder => folder.Name, StringComparer.OrdinalIgnoreCase))
        {
            var path = string.IsNullOrWhiteSpace(parentPath) ? folder.Name : $"{parentPath}/{folder.Name}";
            var indent = new string(' ', indentLevel * 2);

            builder.Append(indent).AppendLine("<folder>");
            builder.Append(indent).Append("  ").Append("<name>").Append(EscapeXml(folder.Name)).AppendLine("</name>");
            builder.Append(indent).Append("  ").Append("<path>").Append(EscapeXml(path)).AppendLine("</path>");
            builder.Append(indent).Append("  ").Append("<description>").Append(EscapeXml(folder.Description)).AppendLine("</description>");
            builder.Append(indent).Append("  ").Append("<system_instruction>").Append(EscapeXml(folder.Description)).AppendLine("</system_instruction>");

            if (foldersByParentId[folder.Id].Any())
            {
                builder.Append(indent).AppendLine("  <children>");
                AppendFolders(builder, foldersByParentId, folder.Id, path, indentLevel + 2);
                builder.Append(indent).AppendLine("  </children>");
            }

            builder.Append(indent).AppendLine("</folder>");
        }
    }

    private static string EscapeXml(string value)
    {
        return SecurityElement.Escape(value) ?? string.Empty;
    }
}
