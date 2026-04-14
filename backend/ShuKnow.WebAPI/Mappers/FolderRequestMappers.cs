using ShuKnow.Domain.Entities;
using ShuKnow.WebAPI.Requests.Folders;

namespace ShuKnow.WebAPI.Mappers;

public static class FolderRequestMappers
{
    public static Folder ToModel(this CreateFolderRequest request, Guid userId)
    {
        return new Folder(
            Guid.NewGuid(),
            userId,
            request.Name,
            request.Description ?? string.Empty,
            request.ParentFolderId,
            emoji: request.Emoji);
    }

    public static Folder ToUpdatedModel(this UpdateFolderRequest request, Folder folder)
    {
        return new Folder(
            folder.Id,
            folder.UserId,
            request.Name ?? folder.Name,
            request.Description ?? folder.Description,
            folder.ParentFolderId,
            folder.SortOrder,
            request.Emoji ?? folder.Emoji);
    }
}
