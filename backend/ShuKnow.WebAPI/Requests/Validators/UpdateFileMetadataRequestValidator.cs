using FluentValidation;
using ShuKnow.WebAPI.Requests.Files;

namespace ShuKnow.WebAPI.Requests.Validators;

public class UpdateFileMetadataRequestValidator : AbstractValidator<UpdateFileMetadataRequest>
{
    public UpdateFileMetadataRequestValidator()
    {
        RuleFor(x => x.Name)
            .MaximumLength(255).WithMessage("Name must not exceed 255 characters")
            .When(x => x.Name is not null);

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Description must not exceed 2000 characters")
            .When(x => x.Description is not null);
    }
}
