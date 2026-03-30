using FluentValidation;
using ShuKnow.WebAPI.Requests.Files;

namespace ShuKnow.WebAPI.Requests.Validators;

public class UpdateTextContentRequestValidator : AbstractValidator<UpdateTextContentRequest>
{
    public UpdateTextContentRequestValidator()
    {
        RuleFor(x => x.Content)
            .NotNull().WithMessage("Content is required");
    }
}
