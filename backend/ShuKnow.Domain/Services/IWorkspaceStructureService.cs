using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Services;

public interface IWorkspaceStructureService
{
    Result MoveFolder(Folder folderToMove, Guid? newParentFolderId, IReadOnlyCollection<Folder> userFolders);
    Result<IReadOnlyList<Folder>> ReorderSiblingFolders(
        Guid movedFolderId,
        int newOrderIndex,
        IReadOnlyCollection<Folder> siblingFolders);
}
