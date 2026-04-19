using AwesomeAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShuKnow.WebAPI.Controllers;

namespace ShuKnow.WebAPI.Tests.Controllers;

public class ActionsControllerTests
{
    private ActionsController sut = null!;

    [SetUp]
    public void SetUp()
    {
        sut = new ActionsController();
    }

    [Test]
    public async Task ListActions_ShouldReturnNotImplemented()
    {
        var response = await sut.ListActions(page: 2, pageSize: 10);

        response.Result.Should().BeOfType<StatusCodeResult>()
            .Which.StatusCode.Should().Be(StatusCodes.Status501NotImplemented);
    }

    [Test]
    public async Task GetAction_ShouldReturnNotImplemented()
    {
        var actionId = Guid.NewGuid();

        var response = await sut.GetAction(actionId);

        response.Result.Should().BeOfType<StatusCodeResult>()
            .Which.StatusCode.Should().Be(StatusCodes.Status501NotImplemented);
    }

    [Test]
    public async Task RollbackAction_ShouldReturnNotImplemented()
    {
        var actionId = Guid.NewGuid();

        var response = await sut.RollbackAction(actionId);

        response.Result.Should().BeOfType<StatusCodeResult>()
            .Which.StatusCode.Should().Be(StatusCodes.Status501NotImplemented);
    }

    [Test]
    public async Task RollbackLastAction_ShouldReturnNotImplemented()
    {
        var response = await sut.RollbackLastAction();

        response.Result.Should().BeOfType<StatusCodeResult>()
            .Which.StatusCode.Should().Be(StatusCodes.Status501NotImplemented);
    }
}
