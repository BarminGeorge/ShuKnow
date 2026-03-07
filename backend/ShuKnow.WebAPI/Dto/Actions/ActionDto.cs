namespace ShuKnow.WebAPI.Dto.Actions;

public record ActionDto(
    Guid Id,
    string Summary,
    int ItemCount,
    bool CanRollback);
