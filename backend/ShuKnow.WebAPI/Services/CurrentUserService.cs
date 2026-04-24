using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using ShuKnow.Application.Interfaces;

namespace ShuKnow.WebAPI.Services;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    private readonly ClaimsPrincipal? user = httpContextAccessor.HttpContext?.User;

    public Guid UserId => Guid.TryParse(user?.FindFirstValue(JwtRegisteredClaimNames.Sub), out var userId)
            ? userId
            : throw new UnauthorizedAccessException("User is not authenticated.");

    public bool IsAuthenticated => user?.Identity?.IsAuthenticated ?? false;
}
