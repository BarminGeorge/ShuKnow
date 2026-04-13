using System.Text;
using Ardalis.Result;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;
using ShuKnow.Domain.Entities;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.Application.Services;

public class AiToolsService(
    IFolderService folderService,
    IFileService fileService,
    IWorkspacePathService workspacePathService,
    IAttachmentService attachmentService,
    IAttachmentFileService attachmentFileService,
    IChatNotificationService notificationService,
    ICurrentUserService currentUserService)
    : IAiToolsService
{
    private Guid CurrentUserId => currentUserService.UserId;

    public async Task<Result<string>> CreateFolderAsync(
        string folderPath,
        string description,
        string emoji,
        CancellationToken ct = default)
    {
        return await folderService.CreateByPathAsync(folderPath, description, emoji, ct)
            .ActAsync(folder => notificationService.SendFolderCreatedAsync(folder, ct))
            .Map(_ => $"Created folder '{folderPath}'.");
    }

    public async Task<Result<string>> CreateTextFileAsync(
        string filePath,
        string content,
        CancellationToken ct = default)
    {
        return await workspacePathService.ResolveFilePathAsync(filePath, ct)
            .BindAsync(path => CreateTextFileAsync(path, content, ct))
            .ActAsync(file => notificationService.SendFileCreatedAsync(file, ct))
            .Map(_ => $"Created text file '{filePath}'.");
    }

    public async Task<Result<string>> SaveAttachment(
        string attachmentId,
        string filePath,
        CancellationToken ct = default)
    {
        return await ParseAttachmentId(attachmentId)
            .BindAsync(id => GetAttachmentAsync(id, ct))
            .BindAsync(attachment => workspacePathService.ResolveFilePathAsync(filePath, ct)
                .BindAsync(path => attachmentFileService.SaveAttachmentToFileAsync(attachment, path, ct))
                .ActAsync(file => notificationService.SendAttachmentSavedAsync(attachment, file.Name, ct)))
            .Map(_ => $"Saved attachment to '{filePath}'.");
    }

    public async Task<Result<string>> AppendTextAsync(
        string filePath,
        string text,
        CancellationToken ct = default)
    {
        return await UpdateTextAsync(filePath, text, static (current, extra) => current + extra, ct)
            .ActAsync(file => notificationService.SendTextAppendedAsync(file, text, ct))
            .Map(_ => $"Appended text to '{filePath}'.");
    }

    public async Task<Result<string>> PrependTextAsync(
        string filePath,
        string text,
        CancellationToken ct = default)
    {
        return await UpdateTextAsync(filePath, text, static (current, extra) => extra + current, ct)
            .ActAsync(file => notificationService.SendTextPrependedAsync(file, text, ct))
            .Map(_ => $"Prepended text to '{filePath}'.");
    }

    public async Task<Result<string>> MoveFileAsync(
        string sourcePath,
        string destinationPath,
        CancellationToken ct = default)
    {
        return await fileService.GetByPathAsync(sourcePath, ct)
            .BindAsync(file =>
            {
                var fromFolderId = file.FolderId;
                return workspacePathService.ResolveFilePathAsync(destinationPath, ct)
                    .BindAsync(path => fileService.MoveAsync(file.Id, path.FolderId, path.FileName, ct))
                    .ActAsync(movedFile => notificationService.SendFileMovedAsync(movedFile, fromFolderId, ct));
            })
            .Map(_ => $"Moved file from '{sourcePath}' to '{destinationPath}'.");
    }

    private async Task<Result<File>> UpdateTextAsync(
        string filePath,
        string text,
        Func<string, string, string> merge,
        CancellationToken ct)
    {
        return await fileService.GetByPathAsync(filePath, ct)
            .Act(file => EnsureTextFile(file, filePath))
            .BindAsync(file => ReadTextAsync(file.Id, ct)
                .BindAsync(content => fileService.UpdateTextContentAsync(file.Id, merge(content, text), ct)));
    }

    private async Task<Result<File>> CreateTextFileAsync(
        ResolvedFilePath path,
        string content,
        CancellationToken ct)
    {
        var bytes = Encoding.UTF8.GetBytes(content);
        using var stream = new MemoryStream(bytes);
        var file = new File(Guid.NewGuid(), CurrentUserId, path.FolderId, path.FileName, string.Empty, "text/plain", bytes.Length);

        return await fileService.UploadAsync(file, stream, ct);
    }

    private async Task<Result<string>> ReadTextAsync(Guid fileId, CancellationToken ct)
    {
        return await fileService.GetContentAsync(fileId, ct: ct)
            .BindAsync(async content =>
            {
                using var reader = new StreamReader(content.Content, Encoding.UTF8, leaveOpen: false);
                return Result.Success(await reader.ReadToEndAsync(ct));
            });
    }

    private async Task<Result<ChatAttachment>> GetAttachmentAsync(Guid attachmentId, CancellationToken ct)
    {
        return await attachmentService.GetByIdsAsync([attachmentId], ct)
            .BindAsync(attachments => attachments.SingleOrDefault() is { } attachment
                ? Result.Success(attachment)
                : Result<ChatAttachment>.NotFound($"Attachment '{attachmentId}' was not found."));
    }

    private static Result EnsureTextFile(File file, string filePath)
    {
        return file.ContentType.StartsWith("text/", StringComparison.OrdinalIgnoreCase)
            ? Result.Success()
            : Result.Invalid(new ValidationError($"File '{filePath}' is not a text file."));
    }

    private static Result<Guid> ParseAttachmentId(string attachmentId)
    {
        return Guid.TryParse(attachmentId, out var id)
            ? Result.Success(id)
            : Result.Invalid(new ValidationError("Attachment id must be a valid GUID."));
    }
}
