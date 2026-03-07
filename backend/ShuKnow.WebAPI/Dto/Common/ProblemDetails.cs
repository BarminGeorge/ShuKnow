namespace ShuKnow.WebAPI.Dto.Common;

/// <summary>
/// RFC 7807 Problem Details for HTTP APIs.
/// </summary>
public record ProblemDetails(
    string? Type,
    string? Title,
    int? Status,
    string? Detail,
    string? Instance);
