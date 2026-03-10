using FluentValidation;
using ShuKnow.WebAPI.Requests.Folders;

namespace ShuKnow.WebAPI.Requests.Validators;

public class MoveFolderRequestValidator : AbstractValidator<MoveFolderRequest>
{
    public MoveFolderRequestValidator()
    {
        RuleFor(x => x.NewParentFolderId)
            .NotEqual(Guid.Empty).WithMessage("NewParentFolderId must be a valid GUID")
            .When(x => x.NewParentFolderId.HasValue);
    }
}
