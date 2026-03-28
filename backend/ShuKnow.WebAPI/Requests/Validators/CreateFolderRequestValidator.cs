using FluentValidation;
using ShuKnow.WebAPI.Requests.Folders;

namespace ShuKnow.WebAPI.Requests.Validators;

public class CreateFolderRequestValidator : AbstractValidator<CreateFolderRequest>
{
    public CreateFolderRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required")
            .Length(1, 255).WithMessage("Name must be between 1 and 255 characters");

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Description must not exceed 2000 characters")
            .When(x => x.Description is not null);

        RuleFor(x => x.Emoji)
            .MaximumLength(8).WithMessage("Emoji must not exceed 8 characters")
            .When(x => x.Emoji is not null);

        RuleFor(x => x.ParentFolderId)
            .NotEqual(Guid.Empty).WithMessage("ParentFolderId must be a valid GUID")
            .When(x => x.ParentFolderId.HasValue);
    }
}
