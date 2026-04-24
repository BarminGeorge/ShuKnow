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
using ShuKnow.Infrastructure.Misc;
using File = System.IO.File;

namespace ShuKnow.Infrastructure.Services;

public class TornadoPromptBuilder(
    IFolderService folderService,
    IFileService fileService,
    IAttachmentService attachmentService,
    IBlobStorageService blobStorageService,
    IChatService chatService,
    IOptions<TornadoAiOptions> options)
{
    private const string DefaultSystemPrompt = """
<examples>

<example_1>

<user_message>
Save this idea: Weekly digest with the top AI news and internal updates.
</user_message>

<assistant_behavior>
Save the exact text of the idea to the ideas file. If the file does not exist, use the most appropriate one or create a new one.
</assistant_behavior>

</example_1>

<example_2>

<user_message>
https://youtu.be/dQw4w9WgXcQ
Attachment: `homework.png` (id: `f61b8ccc-84be-4c92-8dd3-8a4a98b3e13d`)
[Image]
</user_message>

<assistant_behavior>
- Save the link to the appropriate file.
- If the text in `homework.png` is illegible, save it to a file or folder containing your homework. If you have even the slightest doubt, save the entire file to the appropriate folder with the file ID `f61b8ccc-84be-4c92-8dd3-8a4a98b3e13d`.
</assistant_behavior>

</example_2>

<example_3>

<user_message>
Где лежит мой список задач
</user_message>

<assistant_behavior>
Based on the context and structure of the storage, answer the user's question in Russian.
</assistant_behavior>

</example_3>

</examples>

<task>
You are ShuKnow, an AI assistant that organizes information and files using the tools available to you.

Convert the user's incoming information into a saved, organized result.
Prefer taking the needed tool actions over only describing what should be done.
</task>

<rules>
- Use English for your internal reasoning and tool-facing decisions. Use the user's language when communicating with them.
- Be precise and action-oriented.
- Before creating new files or folders, make sure the existing ones aren't suitable.
- If the user gives content to keep, preserve the important details when saving it. 
- If the user asks a question instead of asking to save something, answer it normally unless tool use is clearly needed.
- Before creating or saving a file, make sure the parent folder exists.
</rules>
""";

    public async Task<Result<string>> CreateSystemInstructions(CancellationToken ct = default)
    {
        var promptBase = await LoadPromptBaseAsync(ct);

        return await folderService.GetFolderTreeForPromptAsync(ct)
            .BindAsync(async folders => await fileService.GetFileTreeForPromptAsync(ct)
                .MapAsync(files => $"{BuildFolderContext(folders)}\n\n{BuildFileContext(files, folders)}\n\n{promptBase}"));
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
                        $"Attachment: `{attachment.FileName}` (Id: `{attachment.Id}`)"));

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

    private async Task<string> LoadPromptBaseAsync(CancellationToken ct)
    {
        var configuredPath = options.Value.SystemPromptPath;
        if (string.IsNullOrWhiteSpace(configuredPath))
            return DefaultSystemPrompt;

        var fullPath = ResolvePromptPath(configuredPath);
        if (!File.Exists(fullPath))
            return DefaultSystemPrompt;

        var content = await File.ReadAllTextAsync(fullPath, ct);
        return string.IsNullOrWhiteSpace(content) ? DefaultSystemPrompt : content;
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
            .AppendLine("<folder_tree>\n");

        if (folders.Count == 0)
            builder.AppendLine("Folder tree is empty");
        else
        {
            foreach (var folder in BuildFolderEntries(folders))
            {
                builder.AppendLine("<folder>");
                builder.AppendLine($"Path: `{folder.Path}`");
                builder.AppendLine($"Description: `{folder.Description}`");
                builder.AppendLine("</folder>");
            }
        }

        builder.AppendLine("\n</folder_tree>");

        return builder.ToString();
    }

    private static string BuildFileContext(IReadOnlyList<FileSummary> files, IReadOnlyList<FolderSummary> folders)
    {
        var builder = new StringBuilder()
            .AppendLine("<files>\n");

        if (files.Count == 0)
            builder.AppendLine("File list is empty");
        else
        {
            foreach (var path in BuildFilePaths(files, folders))
            {
                builder.AppendLine("<file>");
                builder.AppendLine($"Path: `{path}`");
                builder.AppendLine("</file>");
            }
        }

        builder.AppendLine("\n</files>");

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

    private static IReadOnlyList<string> BuildFilePaths(
        IReadOnlyList<FileSummary> files,
        IReadOnlyList<FolderSummary> folders)
    {
        var folderPaths = BuildFolderPathLookup(folders);

        return files
            .Select(file => file.FolderId.HasValue && folderPaths.TryGetValue(file.FolderId.Value, out var folderPath)
                ? $"{folderPath}/{file.Name}"
                : file.Name)
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static IReadOnlyDictionary<Guid, string> BuildFolderPathLookup(IReadOnlyList<FolderSummary> folders)
    {
        var folderPaths = new Dictionary<Guid, string>();
        var foldersByParentId = folders.ToLookup(folder => folder.ParentFolderId);

        AppendFolderPaths(folderPaths, foldersByParentId, parentFolderId: null, parentPath: null);
        return folderPaths;
    }

    private static void AppendFolderPaths(
        IDictionary<Guid, string> folderPaths,
        ILookup<Guid?, FolderSummary> foldersByParentId,
        Guid? parentFolderId,
        string? parentPath)
    {
        foreach (var folder in foldersByParentId[parentFolderId].OrderBy(folder => folder.Name, StringComparer.OrdinalIgnoreCase))
        {
            var path = string.IsNullOrWhiteSpace(parentPath) ? folder.Name : $"{parentPath}/{folder.Name}";
            folderPaths[folder.Id] = path;
            AppendFolderPaths(folderPaths, foldersByParentId, folder.Id, path);
        }
    }
}
