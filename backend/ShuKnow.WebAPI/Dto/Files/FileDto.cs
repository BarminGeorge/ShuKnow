namespace ShuKnow.WebAPI.Dto.Files;

public record FileDto(
    Guid Id,
    Guid FolderId,
    string FolderName,
    string Name,
    string? Description,
    string ContentType,
    long SizeBytes);
