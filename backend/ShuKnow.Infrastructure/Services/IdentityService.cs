using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Repositories;
using ShuKnow.Infrastructure.Interfaces;
using ShuKnow.Infrastructure.Misc;

namespace ShuKnow.Infrastructure.Services;

internal class IdentityService(
    IIdentityUserRepository identityUsers,
    IUserRepository users,
    IUnitOfWork unitOfWork,
    IJwtService jwtService,
    IPasswordHasher passwordHasher)
    : IIdentityService
{
    public async Task<Result<string>> RegisterAsync(string login, string password)
    {
        if (await identityUsers.ContainsLoginAsync(login))
            return Result.Conflict("User with this login already exists.");

        var passwordHash = passwordHasher.HashPassword(password);
        var identityUser = new IdentityUser(login, passwordHash);
        var user = identityUser.ToUser();

        await users.AddAsync(user);
        await identityUsers.AddAsync(identityUser);

        return await unitOfWork.SaveChangesAsync()
            .MapAsync(() => jwtService.GenerateToken(user.Id));
    }

    public async Task<Result<string>> LoginAsync(string login, string password)
    {
        return await identityUsers.GetByLoginAsync(login)
            .BindAsync(user =>
                passwordHasher.VerifyPassword(password, user.PasswordHash)
                    ? Result.Success(user)
                    : Result.Unauthorized("Invalid login or password."))
            .MapAsync(user => jwtService.GenerateToken(user.Id));
    }
}
