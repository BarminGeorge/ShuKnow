using FluentValidation;
using ShuKnow.WebAPI.Requests.Folders;

namespace ShuKnow.WebAPI.Requests.Validators;

public class ReorderFolderRequestValidator : AbstractValidator<ReorderFolderRequest>
{
    public ReorderFolderRequestValidator()
    {
        RuleFor(x => x.Position)
            .GreaterThanOrEqualTo(0).WithMessage("Position must be a non-negative number");
    }
}
