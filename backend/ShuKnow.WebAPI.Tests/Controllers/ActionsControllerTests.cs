using AwesomeAssertions;
using ShuKnow.WebAPI.Controllers;
using ShuKnow.WebAPI.Dto.Actions;

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
    public async Task ListActions_ShouldReturnRequestedPagingValues()
    {
        var response = await sut.ListActions(page: 2, pageSize: 10);

        var result = response.Value.Should().BeOfType<PagedActionResult>().Subject;
        result.Items.Should().BeEmpty();
        result.TotalCount.Should().Be(0);
        result.Page.Should().Be(2);
        result.PageSize.Should().Be(10);
        result.HasNextPage.Should().BeFalse();
    }

    [Test]
    public async Task GetAction_ShouldReturnRequestedActionId()
    {
        var actionId = Guid.NewGuid();

        var response = await sut.GetAction(actionId);

        var result = response.Value.Should().BeOfType<ActionDetailDto>().Subject;
        result.Id.Should().Be(actionId);
        result.Summary.Should().NotBeNullOrWhiteSpace();
        result.Items.Should().NotBeEmpty();
    }

    [Test]
    public async Task RollbackAction_ShouldReturnRequestedActionId()
    {
        var actionId = Guid.NewGuid();

        var response = await sut.RollbackAction(actionId);

        var result = response.Value.Should().BeOfType<RollbackResultDto>().Subject;
        result.ActionId.Should().Be(actionId);
        result.RestoredItems.Should().NotBeEmpty();
        result.FullyReverted.Should().BeTrue();
    }

    [Test]
    public async Task RollbackLastAction_ShouldReturnSuccessfulRollback()
    {
        var response = await sut.RollbackLastAction();

        var result = response.Value.Should().BeOfType<RollbackResultDto>().Subject;
        result.ActionId.Should().NotBeEmpty();
        result.RestoredItems.Should().BeEmpty();
        result.FullyReverted.Should().BeTrue();
    }
}
