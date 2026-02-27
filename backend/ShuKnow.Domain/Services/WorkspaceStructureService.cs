using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Services;

public class WorkspaceStructureService : IWorkspaceStructureService
{
    public Result MoveFolder(Folder folderToMove, Guid? newParentFolderId, IReadOnlyCollection<Folder> userFolders)
    {
        if (folderToMove is null)
            return Result.Error("Folder to move is required.");

        if (userFolders is null)
            return Result.Error("Folder collection is required.");

        if (newParentFolderId is null)
            return folderToMove.MoveToParent(null);

        var foldersById = userFolders.ToDictionary(folder => folder.Id);
        if (!foldersById.TryGetValue(newParentFolderId.Value, out var parentFolder))
            return Result.NotFound($"Parent folder '{newParentFolderId}' was not found.");

        if (parentFolder.UserId != folderToMove.UserId)
            return Result.Forbidden("Cannot move folder across different users.");

        var current = parentFolder;
        while (true)
        {
            if (current.Id == folderToMove.Id)
                return Result.Conflict("Cannot move a folder inside its own subtree.");

            if (current.ParentFolderId is null)
                break;

            if (!foldersById.TryGetValue(current.ParentFolderId.Value, out current))
                return Result.Error("Folder hierarchy is inconsistent.");
        }

        return folderToMove.MoveToParent(newParentFolderId);
    }

    public Result<IReadOnlyList<Folder>> ReorderSiblingFolders(
        Guid movedFolderId,
        int newOrderIndex,
        IReadOnlyCollection<Folder> siblingFolders)
    {
        if (movedFolderId == Guid.Empty)
            return Result<IReadOnlyList<Folder>>.Error("Moved folder id cannot be empty.");

        if (siblingFolders is null)
            return Result<IReadOnlyList<Folder>>.Error("Folder collection is required.");

        var orderedFolders = siblingFolders
            .OrderBy(folder => folder.OrderIndex)
            .ThenBy(folder => folder.Id)
            .ToList();

        if (orderedFolders.Count == 0)
            return Result<IReadOnlyList<Folder>>.Error("Folder collection is empty.");

        var movedFolder = orderedFolders.FirstOrDefault(folder => folder.Id == movedFolderId);
        if (movedFolder is null)
            return Result<IReadOnlyList<Folder>>.NotFound($"Folder '{movedFolderId}' was not found.");

        var targetIndex = Math.Clamp(newOrderIndex, 0, orderedFolders.Count - 1);
        orderedFolders.Remove(movedFolder);
        orderedFolders.Insert(targetIndex, movedFolder);

        for (var i = 0; i < orderedFolders.Count; i++)
        {
            var reorderResult = orderedFolders[i].ChangeOrderIndex(i);
            if (reorderResult.Status != ResultStatus.Ok)
                return Result<IReadOnlyList<Folder>>.Error(
                    $"Failed to update order for folder '{orderedFolders[i].Id}'.");
        }

        return Result<IReadOnlyList<Folder>>.Success(orderedFolders);
    }
}
