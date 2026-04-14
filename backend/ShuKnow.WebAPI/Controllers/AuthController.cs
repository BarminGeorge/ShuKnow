using Ardalis.Result;
using Ardalis.Result.AspNetCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Repositories;
using ShuKnow.WebAPI.Dto.Auth;
using ShuKnow.WebAPI.Interfaces;
using ShuKnow.WebAPI.Mappers;
using ShuKnow.WebAPI.Requests.Auth;

namespace ShuKnow.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    IIdentityService identityService,
    IUserRepository users,
    ICurrentUserService currentUser,
    IAuthCookieService authCookies)
    : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<string>> Register([FromBody] RegisterRequest request)
    {
        return ToAuthActionResult(await identityService.RegisterAsync(request.Login, request.Password));
    }

    [HttpPost("login")]
    public async Task<ActionResult<string>> Login([FromBody] LoginRequest request)
    {
        return ToAuthActionResult(await identityService.LoginAsync(request.Login, request.Password));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        return (await users.GetByIdAsync(currentUser.UserId))
            .Map(user => user.ToDto())
            .ToActionResult(this);
    }

    private ActionResult<string> ToAuthActionResult(Result<string> result)
    {
        if (result.IsOk())
            authCookies.SetAuthCookie(Response, result.Value);

        return result.ToActionResult(this);
    }
}
