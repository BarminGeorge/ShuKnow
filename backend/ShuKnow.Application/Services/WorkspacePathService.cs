using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Application.Services;

internal class WorkspacePathService(
    IFolderRepository folderRepository,
    ICurrentUserService currentUserService)
    : IWorkspacePathService
{
    private static readonly StringComparison NameComparison = StringComparison.OrdinalIgnoreCase;

    private Guid CurrentUserId => currentUserService.UserId;

    public async Task<Result<Folder>> ResolveFolderAsync(string folderPath, CancellationToken ct = default)
    {
        var parseResult = ParseFolderPath(folderPath);
        if (!parseResult.IsSuccess)
            return parseResult.Map(_ => default(Folder)!);

        return await ResolveFolderAsync(parseResult.Value.Segments);
    }

    public async Task<Result<ResolvedFolderCreationPath>> ResolveFolderCreationPathAsync(
        string folderPath,
        CancellationToken ct = default)
    {
        var parseResult = ParseFolderPath(folderPath);
        if (!parseResult.IsSuccess)
            return parseResult.Map(_ => default(ResolvedFolderCreationPath)!);

        if (parseResult.Value.Segments.Count == 1)
            return Result.Success(new ResolvedFolderCreationPath(parseResult.Value.Name, null, folderPath));

        var parentSegments = parseResult.Value.Segments.Take(parseResult.Value.Segments.Count - 1).ToArray();
        return await ResolveFolderAsync(parentSegments)
            .MapAsync(parent => new ResolvedFolderCreationPath(parseResult.Value.Name, parent.Id, folderPath));
    }

    public async Task<Result<ResolvedFilePath>> ResolveFilePathAsync(string filePath, CancellationToken ct = default)
    {
        var parseResult = ParseFilePath(filePath);
        if (!parseResult.IsSuccess)
            return parseResult.Map(_ => default(ResolvedFilePath)!);

        return await ResolveFolderAsync(parseResult.Value.FolderSegments)
            .MapAsync(folder => new ResolvedFilePath(parseResult.Value.FileName, folder.Id, filePath));
    }

    private async Task<Result<Folder>> ResolveFolderAsync(IReadOnlyList<string> segments)
    {
        var currentFoldersResult = await folderRepository.GetRootFoldersAsync(CurrentUserId);
        if (!currentFoldersResult.IsSuccess)
            return currentFoldersResult.Map(_ => default(Folder)!);

        Folder? currentFolder = null;
        foreach (var segment in segments)
        {
            currentFolder = currentFoldersResult.Value.FirstOrDefault(folder => NamesEqual(folder.Name, segment));
            if (currentFolder is null)
                return Result<Folder>.NotFound($"Folder '{string.Join("/", segments)}' was not found.");

            currentFoldersResult = await folderRepository.GetChildrenAsync(currentFolder.Id, CurrentUserId);
            if (!currentFoldersResult.IsSuccess)
                return currentFoldersResult.Map(_ => currentFolder);
        }

        return Result.Success(currentFolder!);
    }

    private static Result<FolderPathParts> ParseFolderPath(string folderPath)
    {
        var segments = SplitPath(folderPath);
        if (segments.Length == 0)
            return Result<FolderPathParts>.Invalid(new ValidationError("Folder path is required."));

        if (HasRelativeSegments(segments))
            return Result<FolderPathParts>.Invalid(new ValidationError("Path must not contain '.' or '..' segments."));

        return Result.Success(new FolderPathParts(segments[^1], segments));
    }

    private static Result<FilePathParts> ParseFilePath(string filePath)
    {
        var segments = SplitPath(filePath);
        if (segments.Length < 2)
        {
            return Result<FilePathParts>.Invalid(
                new ValidationError("File path must include a parent folder and file name."));
        }

        if (HasRelativeSegments(segments))
            return Result<FilePathParts>.Invalid(new ValidationError("Path must not contain '.' or '..' segments."));

        return Result.Success(new FilePathParts(segments[^1], segments.Take(segments.Length - 1).ToArray()));
    }

    private static string[] SplitPath(string path)
    {
        return path.Split(['/', '\\'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }

    private static bool HasRelativeSegments(IEnumerable<string> segments)
    {
        return segments.Any(segment => segment is "." or "..");
    }

    private static bool NamesEqual(string left, string right)
    {
        return string.Equals(left, right, NameComparison);
    }

    private sealed record FolderPathParts(string Name, IReadOnlyList<string> Segments);

    private sealed record FilePathParts(string FileName, IReadOnlyList<string> FolderSegments);
}
