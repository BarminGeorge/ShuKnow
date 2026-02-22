using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using PPshu.Application.Interfaces;

namespace PPshu.WebAPI.Services;

public class CurrentUserService : ICurrentUserService
{
    public Guid UserId { get; }
    public bool IsAuthenticated { get; }
    
    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        var user = httpContextAccessor.HttpContext?.User;
        IsAuthenticated = user?.Identity?.IsAuthenticated ?? false;
        
        var claim = user?.FindFirstValue(ClaimTypes.NameIdentifier);
        UserId = Guid.TryParse(claim, out var userId) ? userId : Guid.Empty;
    }
}