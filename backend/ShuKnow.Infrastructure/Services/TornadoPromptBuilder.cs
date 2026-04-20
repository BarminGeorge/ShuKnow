using System.Security;
using System.Text;
using Ardalis.Result;
using LlmTornado.Chat;
using LlmTornado.Code;
using LlmTornado.Images;
using Microsoft.Extensions.Options;
using ShuKnow.Application.Common;
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
    IChatService chatService,
    IOptions<TornadoAiOptions> options)
{
    private const string DefaultDirectives = """
<DIRECTIVES>
START_DIRECTIVES
You are ShuKnow.
Use English.
Your job is to organize and save the user's content with the available tools.
Folder descriptions are folder-specific system instructions entered by the user.
If no folders exist, save to inbox.
If folders exist but no folder is a clear match, save to inbox.
Do not invent folders that are not present in the provided context.
When the user wants content saved, prefer taking the tool action instead of only describing it.
When the user is asking a question rather than asking to save or organize content, answer normally unless tool use is needed.
After tool use, reply briefly and concretely.
END_DIRECTIVES
</DIRECTIVES>
""";

    private const string FewShotExamples = """
<EXAMPLES>
START_EXAMPLES
<EXAMPLE>
USER: Save this idea: Weekly digest with the top AI news and internal updates.
ASSISTANT: Save the content. No clear user folder is available. Use inbox.
</EXAMPLE>
<EXAMPLE>
USER: Put these meeting notes into the Project Atlas folder.
ASSISTANT: If Project Atlas exists, save the notes there. Treat that folder's description as its system instruction. If there is no clear matching folder, use inbox.
</EXAMPLE>
<EXAMPLE>
USER: Save this receipt for later.
ASSISTANT: Save the content. If there is no clear matching folder, use inbox.
</EXAMPLE>
<EXAMPLE>
USER: What did I save yesterday about onboarding?
ASSISTANT: This is a retrieval request. Use tools only if needed, then answer briefly.
</EXAMPLE>
END_EXAMPLES
</EXAMPLES>
""";

    public async Task<Result<string>> CreateSystemInstructions(CancellationToken ct = default)
    {
        var directives = await LoadDirectivesAsync(ct);
        return await folderService.GetFolderTreeForPromptAsync(ct)
            .MapAsync(folders => string.Join(
                Environment.NewLine + Environment.NewLine,
                BuildFolderContext(folders),
                FewShotExamples,
                directives));
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

    private async Task<string> LoadDirectivesAsync(CancellationToken ct)
    {
        var configuredPath = options.Value.SystemPromptPath;
        if (string.IsNullOrWhiteSpace(configuredPath))
            return DefaultDirectives;

        var fullPath = ResolvePromptPath(configuredPath);
        if (!System.IO.File.Exists(fullPath))
            return DefaultDirectives;

        var content = await System.IO.File.ReadAllTextAsync(fullPath, ct);
        return string.IsNullOrWhiteSpace(content) ? DefaultDirectives : content;
    }

    private static string ResolvePromptPath(string configuredPath)
    {
        return Path.IsPathRooted(configuredPath)
            ? configuredPath
            : Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, configuredPath));
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

    private static string BuildFolderContext(IReadOnlyList<FolderSummary> folders)
    {
        var builder = new StringBuilder()
            .AppendLine("<CONTEXT>")
            .AppendLine("START_FOLDER_CONTEXT")
            .AppendLine("Folder descriptions are user-defined folder instructions.")
            .AppendLine("If no folders exist, or no folder is a clear match, use inbox.")
            .AppendLine("<INBOX>")
            .AppendLine("PATH: inbox")
            .AppendLine("DESCRIPTION: Default destination for content when no clear folder match exists.")
            .AppendLine("</INBOX>");

        if (folders.Count == 0)
        {
            builder.AppendLine("<FOLDERS EMPTY=\"true\" />");
        }
        else
        {
            foreach (var folder in BuildFolderEntries(folders))
            {
                builder.AppendLine("<FOLDER>");
                builder.Append("PATH: ").AppendLine(EscapeText(folder.Path));
                builder.Append("DESCRIPTION: ").AppendLine(EscapeText(folder.Description));
                builder.Append("SYSTEM_INSTRUCTION: ").AppendLine(EscapeText(folder.Description));
                builder.AppendLine("</FOLDER>");
            }
        }

        builder.AppendLine("END_FOLDER_CONTEXT")
            .Append("</CONTEXT>");

        return builder.ToString();
    }

    private static IReadOnlyList<(string Path, string Description)> BuildFolderEntries(IReadOnlyList<FolderSummary> folders)
    {
        var foldersByParentId = folders.ToLookup(folder => folder.ParentFolderId);
        var entries = new List<(string Path, string Description)>();

        AppendFolderEntries(entries, foldersByParentId, parentFolderId: null, parentPath: null);
        return entries;
    }

    private static void AppendFolderEntries(
        ICollection<(string Path, string Description)> entries,
        ILookup<Guid?, FolderSummary> foldersByParentId,
        Guid? parentFolderId,
        string? parentPath)
    {
        foreach (var folder in foldersByParentId[parentFolderId].OrderBy(folder => folder.Name, StringComparer.OrdinalIgnoreCase))
        {
            var path = string.IsNullOrWhiteSpace(parentPath) ? folder.Name : $"{parentPath}/{folder.Name}";
            entries.Add((path, folder.Description));
            AppendFolderEntries(entries, foldersByParentId, folder.Id, path);
        }
    }

    private static string EscapeText(string value)
    {
        return SecurityElement.Escape(value) ?? string.Empty;
    }
}
