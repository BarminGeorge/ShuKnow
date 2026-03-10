using FluentValidation;
using ShuKnow.WebAPI.Requests.Auth;

namespace ShuKnow.WebAPI.Requests.Validators;

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Login)
            .NotEmpty().WithMessage("Login is required")
            .Length(3, 50).WithMessage("Login must be between 3 and 50 characters")
            .Matches("^[a-zA-Z0-9_]+$").WithMessage("Login can only contain letters, numbers, and underscores");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters");
    }
}
