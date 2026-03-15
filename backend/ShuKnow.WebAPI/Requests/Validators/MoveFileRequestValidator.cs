using FluentValidation;
using ShuKnow.WebAPI.Requests.Files;

namespace ShuKnow.WebAPI.Requests.Validators;

public class MoveFileRequestValidator : AbstractValidator<MoveFileRequest>
{
    public MoveFileRequestValidator()
    {
        RuleFor(x => x.TargetFolderId)
            .NotEqual(Guid.Empty).WithMessage("TargetFolderId must be a valid GUID");
    }
}
