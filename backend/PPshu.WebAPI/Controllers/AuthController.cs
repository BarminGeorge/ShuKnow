using Ardalis.Result;
using Ardalis.Result.AspNetCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PPshu.Application.Interfaces;
using PPshu.Domain.Repositories;
using PPshu.WebAPI.Dto;
using PPshu.WebAPI.Mappers;
using PPshu.WebAPI.Requests;

namespace PPshu.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IIdentityService identityService, IUserRepository users, ICurrentUserService currentUser)
    : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult> Register([FromBody] RegisterRequest request)
    {
        var result = await identityService.RegisterAsync(request.Login, request.Password);
        return result.ToActionResult(this);
    }

    [HttpPost("login")]
    public async Task<ActionResult<string>> Login([FromBody] LoginRequest request)
    {
        var result = await identityService.LoginAsync(request.Login, request.Password);
        return result.ToActionResult(this);
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
}