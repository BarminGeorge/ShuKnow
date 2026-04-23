namespace ShuKnow.Application.Models;

public record FileSummary(
    Guid Id,
    string Name,
    Guid? FolderId);
