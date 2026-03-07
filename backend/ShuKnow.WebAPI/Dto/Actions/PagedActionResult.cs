namespace ShuKnow.WebAPI.Dto.Actions;

public record PagedActionResult(
    IReadOnlyList<ActionDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    bool HasNextPage);
