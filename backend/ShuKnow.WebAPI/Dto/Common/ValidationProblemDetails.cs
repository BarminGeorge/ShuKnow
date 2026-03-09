namespace ShuKnow.WebAPI.Dto.Common;

/// <summary>
/// RFC 7807 Problem Details with validation errors extension.
/// </summary>
public record ValidationProblemDetails(
    string? Type,
    string? Title,
    int? Status,
    string? Detail,
    string? Instance,
    IReadOnlyDictionary<string, IReadOnlyList<string>>? Errors) : ProblemDetails(
    Type, Title, Status, Detail, Instance);
