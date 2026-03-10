namespace ShuKnow.WebAPI.Events;

public record ValidationFailedEvent(
    string TargetMethod,
    IReadOnlyList<ValidationError> Errors);

public record ValidationError(
    string PropertyName,
    string ErrorMessage);