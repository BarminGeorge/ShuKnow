using Ardalis.Result;

namespace ShuKnow.Domain.Common;

internal static class DomainResult
{
    public static Result Invalid(string identifier, string message)
    {
        return Result.Invalid(
            new List<ValidationError>
            {
                new()
                {
                    Identifier = identifier,
                    ErrorMessage = message
                }
            });
    }

    public static Result<T> Invalid<T>(string identifier, string message)
    {
        return Result<T>.Invalid(
            new List<ValidationError>
            {
                new()
                {
                    Identifier = identifier,
                    ErrorMessage = message
                }
            });
    }
}
