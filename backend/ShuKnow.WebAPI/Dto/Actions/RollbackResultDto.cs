namespace ShuKnow.WebAPI.Dto.Actions;

public record RollbackResultDto(
    Guid ActionId,
    IReadOnlyList<RollbackItemDto> RestoredItems,
    bool FullyReverted);
