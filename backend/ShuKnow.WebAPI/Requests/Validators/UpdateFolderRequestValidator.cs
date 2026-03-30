using FluentValidation;
using ShuKnow.WebAPI.Requests.Folders;

namespace ShuKnow.WebAPI.Requests.Validators;

public class UpdateFolderRequestValidator : AbstractValidator<UpdateFolderRequest>
{
    public UpdateFolderRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name must not be empty when provided")
            .Length(1, 255).WithMessage("Name must be between 1 and 255 characters")
            .When(x => x.Name is not null);

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Description must not exceed 2000 characters")
            .When(x => x.Description is not null);

        RuleFor(x => x.Emoji)
            .MaximumLength(8).WithMessage("Emoji must not exceed 8 characters")
            .When(x => x.Emoji is not null);
    }
}
