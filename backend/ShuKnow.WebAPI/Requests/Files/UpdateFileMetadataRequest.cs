namespace ShuKnow.WebAPI.Requests.Files;

public record UpdateFileMetadataRequest(
    string? Name = null,
    string? Description = null);
