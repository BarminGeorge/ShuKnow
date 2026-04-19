using Ardalis.Result;
using AwesomeAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using NSubstitute;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;
using ShuKnow.WebAPI.Controllers;
using ShuKnow.WebAPI.Dto.Auth;
using ShuKnow.WebAPI.Interfaces;
using ShuKnow.WebAPI.Requests.Auth;

namespace ShuKnow.WebAPI.Tests.Controllers;

public class AuthControllerTests
{
    private IIdentityService identityService = null!;
    private IUserRepository users = null!;
    private ICurrentUserService currentUser = null!;
    private IAuthCookieService authCookies = null!;
    private AuthController sut = null!;

    [SetUp]
    public void SetUp()
    {
        identityService = Substitute.For<IIdentityService>();
        users = Substitute.For<IUserRepository>();
        currentUser = Substitute.For<ICurrentUserService>();
        authCookies = Substitute.For<IAuthCookieService>();
        sut = new AuthController(identityService, users, currentUser, authCookies)
        {
            ControllerContext = CreateControllerContext()
        };
    }

    [Test]
    public async Task Register_WhenIdentitySucceeds_ShouldSetAuthCookieAndReturnToken()
    {
        identityService.RegisterAsync("user", "password")
            .Returns(Task.FromResult(Result.Success("jwt-token")));

        var response = await sut.Register(new RegisterRequest("user", "password"));

        var token = GetOkValue<string>(response);
        token.Should().Be("jwt-token");
        authCookies.Received(1).SetAuthCookie(sut.Response, "jwt-token");
    }

    [Test]
    public async Task Login_WhenIdentitySucceeds_ShouldSetAuthCookieAndReturnToken()
    {
        identityService.LoginAsync("user", "password")
            .Returns(Task.FromResult(Result.Success("login-token")));

        var response = await sut.Login(new LoginRequest("user", "password"));

        GetOkValue<string>(response).Should().Be("login-token");
        authCookies.Received(1).SetAuthCookie(sut.Response, "login-token");
    }

    [Test]
    public async Task Login_WhenIdentityFails_ShouldReturnFailureAndSkipCookie()
    {
        identityService.LoginAsync("user", "bad-password")
            .Returns(Task.FromResult(Result<string>.Invalid(new ValidationError("bad credentials"))));

        var response = await sut.Login(new LoginRequest("user", "bad-password"));

        GetStatusCode(response.Result).Should().Be(StatusCodes.Status400BadRequest);
        authCookies.DidNotReceive()
            .SetAuthCookie(Arg.Any<HttpResponse>(), Arg.Any<string>());
    }

    [Test]
    public async Task Me_WhenUserExists_ShouldReturnCurrentUserDto()
    {
        var userId = Guid.NewGuid();
        currentUser.UserId.Returns(userId);
        users.GetByIdAsync(userId)
            .Returns(Task.FromResult(Result.Success(new User(userId, "current-user"))));

        var response = await sut.Me();

        var dto = GetOkValue<UserDto>(response);
        dto.Id.Should().Be(userId);
        dto.Login.Should().Be("current-user");
    }

    private static T GetOkValue<T>(ActionResult<T> response)
    {
        var objectResult = response.Result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status200OK);
        return objectResult.Value.Should().BeAssignableTo<T>().Subject;
    }

    private static int? GetStatusCode(IActionResult? result)
    {
        return result switch
        {
            ObjectResult objectResult => objectResult.StatusCode,
            StatusCodeResult statusCodeResult => statusCodeResult.StatusCode,
            _ => null
        };
    }

    private static ControllerContext CreateControllerContext()
    {
        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext(),
            ActionDescriptor = new ControllerActionDescriptor()
        };
    }
}
