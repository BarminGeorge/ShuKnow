using FluentResults;
using Microsoft.EntityFrameworkCore;
using PPshu.Application.Interfaces;
using PPshu.Domain.Repositories;
using PPshu.Infrastructure.Interfaces;
using PPshu.Infrastructure.Misc;
using PPshu.Infrastructure.Persistent;

namespace PPshu.Infrastructure.Services;

internal class IdentityService(
    AppDbContext context,
    IUserRepository userRepository,
    IJwtService jwtService,
    IPasswordHasher passwordHasher)
    : IIdentityService
{
    public async Task<Result> RegisterAsync(string login, string password)
    {
        if (context.IdentityUsers.Any(u => u.Login == login))
            return Result.Fail("User with this login already exists.");

        var passwordHash = passwordHasher.HashPassword(password);
        var identityUser = new IdentityUser(login, passwordHash);
        var user = identityUser.ToUser();
        
        await userRepository.AddAsync(user);
        await context.IdentityUsers.AddAsync(identityUser);
        await context.SaveChangesAsync();

        return Result.Ok();
    }

    public async Task<Result<string>> LoginAsync(string login, string password)
    {
        var identityUser = await context.IdentityUsers.FirstOrDefaultAsync(u => u.Login == login);
        if (identityUser is null)
            return Result.Fail<string>("Invalid login or password.");

        if (!passwordHasher.VerifyPassword(password, identityUser.PasswordHash))
            return Result.Fail<string>("Invalid login or password.");
        
        var token = jwtService.GenerateToken(identityUser.Id);
        return Result.Ok(token);
    }
}