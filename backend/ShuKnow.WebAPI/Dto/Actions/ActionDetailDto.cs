namespace ShuKnow.WebAPI.Dto.Actions;

public record ActionDetailDto(
    Guid Id,
    string Summary,
    IReadOnlyList<ActionItemDto> Items);
