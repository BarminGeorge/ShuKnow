using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using PPshu.Application.Interfaces;

namespace PPshu.WebAPI.Services;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public Guid UserId => Guid.TryParse(User?.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)
        ? userId
        : throw new UnauthorizedAccessException("User is not authenticated.");

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    private ClaimsPrincipal? User => httpContextAccessor.HttpContext?.User;
}