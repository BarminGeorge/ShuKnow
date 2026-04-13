using FluentValidation;
using ShuKnow.WebAPI.Requests.Files;

namespace ShuKnow.WebAPI.Requests.Validators;

public class MoveFileRequestValidator : AbstractValidator<MoveFileRequest>
{
    public MoveFileRequestValidator()
    {
        RuleFor(x => x.TargetFolderId)
            .Must(folderId => folderId is null || folderId != Guid.Empty)
            .WithMessage("TargetFolderId must be null for root or a valid GUID");
    }
}
