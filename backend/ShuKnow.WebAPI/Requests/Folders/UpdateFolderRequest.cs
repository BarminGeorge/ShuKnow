namespace ShuKnow.WebAPI.Requests.Folders;

public record UpdateFolderRequest(
    string? Name = null,
    string? Description = null,
    string? Emoji = null);
