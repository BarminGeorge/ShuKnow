namespace ShuKnow.WebAPI.Requests.Files;

public record MoveFileRequest(
    Guid? TargetFolderId);
