using Ardalis.Result;
using LlmTornado.ChatFunctions;
using LlmTornado.Common;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using static ShuKnow.Infrastructure.Misc.TornadoAiToolUtil;

namespace ShuKnow.Infrastructure.Services;

public class TornadoToolsService
{
    private const string DefaultToolErrorMessage = "One or more error occurred";
    private readonly Dictionary<string, Func<FunctionCall, CancellationToken, Task<Result<string>>>> dispatchers =
        new(StringComparer.Ordinal);

    public List<Tool> Tools { get; } = [];

    public TornadoToolsService(IAiToolsService toolsService)
    {
        RegisterTool(toolsService.CreateFolderAsync, "create_folder",
            "Creates a new folder at the specified path with a description and an emoji.");
        RegisterTool(toolsService.CreateTextFileAsync, "create_text_file",
            "Creates a new text file at the specified path with the given content.");
        RegisterTool(toolsService.SaveAttachment, "save_attachment",
            "Saves an attachment to the specified file path.");
        RegisterTool(toolsService.AppendTextAsync, "append_text",
            "Appends text to an existing file at the specified path.");
        RegisterTool(toolsService.PrependTextAsync, "prepend_text",
            "Prepends text to an existing file at the specified path.");
        RegisterTool(toolsService.MoveFileAsync, "move_file",
            "Moves a file from the source path to the destination path.");
    }

    public async ValueTask DispatchToolCalls(List<FunctionCall> calls, CancellationToken ct = default)
    {
        foreach (var call in calls)
        {
            var result = await HandleFunctionCall(call, ct);
            call.Result = result.IsSuccess
                ? new FunctionResult(call, result.Value, true)
                : new FunctionResult(call, result.GetFirstErrorOrDefault(DefaultToolErrorMessage), false);
        }
    }

    private async Task<Result<string>> HandleFunctionCall(FunctionCall call, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(call.Name) || !dispatchers.TryGetValue(call.Name, out var dispatch))
            return Result.Error($"Unknown function: {call.Name}");

        return await dispatch(call, ct);
    }

    private void RegisterTool(Delegate function, string name, string description)
    {
        var registration = CreateToolRegistration(function, name, description);
        Tools.Add(registration.Tool);
        dispatchers.Add(registration.Name, registration.Dispatch);
    }
}
