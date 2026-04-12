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

    [Test]
    public async Task DispatchToolCalls_WhenMultipleCalls_ShouldExecuteSequentially()
    {
        var toolsService = Substitute.For<IAiToolsService>();
        var invocationOrder = new List<string>();
        var lockObj = new object();

        toolsService.CreateFolderAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(async callInfo =>
            {
                lock (lockObj) { invocationOrder.Add("create_folder"); }
                await Task.Delay(50);
                return Result.Success("folder created");
            });
        toolsService.CreateTextFileAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(async callInfo =>
            {
                lock (lockObj) { invocationOrder.Add("create_file"); }
                await Task.Delay(50);
                return Result.Success("file created");
            });

        var sut = new TornadoToolsService(toolsService);
        var folderCall = CreateCall("create_folder", """{"folderPath":"root","description":"test","emoji":"📁"}""");
        var fileCall = CreateCall("create_text_file", """{"filePath":"root/file.txt","content":"hello"}""");

        await sut.DispatchToolCalls([folderCall, fileCall]);

        invocationOrder.Should().Equal("create_folder", "create_file");
        folderCall.Result.InvocationSucceeded.Should().BeTrue();
        fileCall.Result.InvocationSucceeded.Should().BeTrue();
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
