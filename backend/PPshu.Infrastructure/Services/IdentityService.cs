using Ardalis.Result;
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
        if (await context.IdentityUsers.AnyAsync(u => u.Login == login))
            return Result.Conflict("User with this login already exists.");
        
        var passwordHash = passwordHasher.HashPassword(password);
        var identityUser = new IdentityUser(login, passwordHash);
        var user = identityUser.ToUser();
        
        userRepository.Add(user);
        context.IdentityUsers.Add(identityUser);

        try
        {
            await context.SaveChangesAsync();
            return Result.Success();
        }
        catch (DbUpdateException)
        {
            if (await context.IdentityUsers.AnyAsync(u => u.Login == login))
                return Result.Conflict("User with this login already exists.");
            
            throw;
        }
    }

    public async Task<Result<string>> LoginAsync(string login, string password)
    {
        var identityUser = await context.IdentityUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Login == login);

        if (identityUser is null || !passwordHasher.VerifyPassword(password, identityUser.PasswordHash))
            return Result.Unauthorized("Invalid login or password.");
        
        var token = jwtService.GenerateToken(identityUser.Id);
        return Result.Success(token);
    }
}