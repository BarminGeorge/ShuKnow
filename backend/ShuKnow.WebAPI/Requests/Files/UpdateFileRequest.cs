namespace ShuKnow.WebAPI.Requests.Files;

public record UpdateFileRequest(
    string? Name = null,
    string? Description = null);
