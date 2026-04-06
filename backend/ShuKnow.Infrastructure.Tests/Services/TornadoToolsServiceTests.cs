using Ardalis.Result;
using AwesomeAssertions;
using LlmTornado.ChatFunctions;
using NSubstitute;
using ShuKnow.Application.Interfaces;
using ShuKnow.Infrastructure.Services;

namespace ShuKnow.Infrastructure.Tests.Services;

public class TornadoToolsServiceTests
{
    [Test]
    public async Task DispatchToolCalls_WhenRegisteredTool_ShouldInvokeRegisteredDelegate()
    {
        var toolsService = Substitute.For<IAiToolsService>();
        toolsService.MoveFileAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success("moved")));
        var sut = new TornadoToolsService(toolsService);
        var call = CreateCall("move_file", """{"sourcePath":"from.txt","destinationPath":"to.txt"}""");
        using var cts = new CancellationTokenSource();

        await sut.DispatchToolCalls([call], cts.Token);

        await toolsService.Received(1).MoveFileAsync("from.txt", "to.txt", cts.Token);
        call.Result.Should().NotBeNull();
        call.Result.InvocationSucceeded.Should().BeTrue();
    }

    private static FunctionCall CreateCall(string name, string argumentsJson)
    {
        return new FunctionCall
        {
            Name = name,
            Arguments = argumentsJson
        };
    }
}
