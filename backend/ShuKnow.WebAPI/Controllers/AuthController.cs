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
        var result = await identityService.RegisterAsync(request.Login, request.Password);
        return ToAuthActionResult(result);
    }

    [HttpPost("login")]
    public async Task<ActionResult<string>> Login([FromBody] LoginRequest request)
    {
        var result = await identityService.LoginAsync(request.Login, request.Password);
        return ToAuthActionResult(result);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        var userResult = await users.GetByIdAsync(currentUser.UserId);
        return userResult
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