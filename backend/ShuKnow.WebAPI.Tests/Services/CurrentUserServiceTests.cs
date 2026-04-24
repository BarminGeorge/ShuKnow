using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AwesomeAssertions;
using Microsoft.AspNetCore.Http;
using ShuKnow.WebAPI.Services;

namespace ShuKnow.WebAPI.Tests.Services;

public class CurrentUserServiceTests
{
    [Test]
    public void UserId_WhenHttpContextIsClearedAfterCreation_ShouldUseCapturedUser()
    {
        var userId = Guid.NewGuid();
        var accessor = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext
            {
                User = CreateUser(userId)
            }
        };
        var sut = new CurrentUserService(accessor);

        accessor.HttpContext = null;

        sut.UserId.Should().Be(userId);
        sut.IsAuthenticated.Should().BeTrue();
    }

    [Test]
    public void UserId_WhenUserIsNotAuthenticated_ShouldThrowUnauthorizedAccessException()
    {
        var accessor = new HttpContextAccessor();
        var sut = new CurrentUserService(accessor);

        var act = () => sut.UserId;

        act.Should().Throw<UnauthorizedAccessException>()
            .WithMessage("User is not authenticated.");
        sut.IsAuthenticated.Should().BeFalse();
    }

    private static ClaimsPrincipal CreateUser(Guid userId)
    {
        var identity = new ClaimsIdentity(
            [new Claim(JwtRegisteredClaimNames.Sub, userId.ToString())],
            authenticationType: "Test");

        return new ClaimsPrincipal(identity);
    }
}
