namespace ShuKnow.WebAPI.Dto.Files;

public record PagedFileResult(
    IReadOnlyList<FileDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    bool HasNextPage);
