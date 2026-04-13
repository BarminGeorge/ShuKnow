using Ardalis.Result;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Domain.Extensions;

public static class UserAiSettingsExtensions
{
    public static Result<Uri?> ParseBaseUrl(this UserAiSettings settings)
    {
        if (string.IsNullOrEmpty(settings.BaseUrl))
            return Result.Success<Uri?>(null);

        return Uri.TryCreate(settings.BaseUrl, UriKind.Absolute, out var uri)
            ? Result.Success<Uri?>(uri)
            : Result.Error($"Invalid base url: {settings.BaseUrl}");
    }
}