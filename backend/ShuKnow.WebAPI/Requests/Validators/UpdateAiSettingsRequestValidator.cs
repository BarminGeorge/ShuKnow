using FluentValidation;
using ShuKnow.WebAPI.Requests.Settings;

namespace ShuKnow.WebAPI.Requests.Validators;

public class UpdateAiSettingsRequestValidator : AbstractValidator<UpdateAiSettingsRequest>
{
    public UpdateAiSettingsRequestValidator()
    {
        RuleFor(x => x.BaseUrl)
            .NotEmpty().WithMessage("BaseUrl is required")
            .Must(BeAValidUrl).WithMessage("BaseUrl must be a valid URL");

        RuleFor(x => x.ApiKey)
            .NotEmpty().WithMessage("ApiKey is required");

        RuleFor(x => x.Provider)
            .IsInEnum().WithMessage("Invalid provider value")
            .When(x => x.Provider is not null);
    }

    private static bool BeAValidUrl(string url)
    {
        return Uri.TryCreate(url, UriKind.Absolute, out var result)
               && (result.Scheme == Uri.UriSchemeHttp || result.Scheme == Uri.UriSchemeHttps);
    }
}
