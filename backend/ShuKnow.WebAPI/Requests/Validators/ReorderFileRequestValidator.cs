using FluentValidation;
using ShuKnow.WebAPI.Requests.Files;

namespace ShuKnow.WebAPI.Requests.Validators;

public class ReorderFileRequestValidator : AbstractValidator<ReorderFileRequest>
{
    public ReorderFileRequestValidator()
    {
        RuleFor(x => x.Position)
            .GreaterThanOrEqualTo(0).WithMessage("Position must be a non-negative number");
    }
}
