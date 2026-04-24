using FluentValidation;
using ShuKnow.WebAPI.Events;

namespace ShuKnow.WebAPI.Requests.Validators;

public class SendMessageCommandValidator : AbstractValidator<SendMessageCommand>
{
    public SendMessageCommandValidator()
    {
        RuleFor(x => x.SessionId)
            .NotEmpty().WithMessage("SessionId is required");

        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("Content is required");

        RuleFor(x => x.Context)
            .MaximumLength(5000).WithMessage("Context must not exceed 5000 characters")
            .When(x => x.Context is not null);
    }
}
