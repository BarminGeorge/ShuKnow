using Ardalis.Result;
using LlmTornado.ChatFunctions;
using LlmTornado.Common;
using ShuKnow.Application.Interfaces;
using static ShuKnow.Infrastructure.Misc.TornadoAiToolUtil;

namespace ShuKnow.Infrastructure.Services;

public class TornadoToolsService(IAiToolsService toolsService)
{
    public List<Tool> Tools { get; } =
    [
        CreateTool(toolsService.CreateFolderAsync, "create_folder", "Creates a new folder at the specified path with a description and an emoji."),
        CreateTool(toolsService.CreateTextFileAsync, "create_text_file", "Creates a new text file at the specified path with the given content."),
        CreateTool(toolsService.SaveAttachment, "save_attachment", "Saves an attachment to the specified file path."),
        CreateTool(toolsService.AppendTextAsync, "append_text", "Appends text to an existing file at the specified path."),
        CreateTool(toolsService.PrependTextAsync, "prepend_text", "Prepends text to an existing file at the specified path."),
        CreateTool(toolsService.MoveFileAsync, "move_file", "Moves a file from the source path to the destination path."),
    ];

    public async ValueTask DispatchToolCalls(List<FunctionCall> calls, CancellationToken ct = default)
    {
        await Task.WhenAll(calls.Select(async call =>
        {
            var result = await HandleFunctionCall(call, ct);
            call.Result = result.IsSuccess
                ? new FunctionResult(call, result.Value, true)
                : new FunctionResult(call,
                    result.Errors.FirstOrDefault() ?? result.ValidationErrors.FirstOrDefault()?.ErrorMessage ??
                    "One or more error occured", false);
        }));
    }

    private async Task<Result<string>> HandleFunctionCall(FunctionCall call, CancellationToken ct = default)
    {
        switch (call.Name)
        {
            case "create_folder":
                var folderPath = call.GetOrDefault<string>("folderPath");
                var description = call.GetOrDefault<string>("description");
                var emoji = call.GetOrDefault<string>("emoji");
                if (folderPath is null || description is null || emoji is null)
                    return Result.Error("Invalid parameters for create_folder");
                return await toolsService.CreateFolderAsync(folderPath, description, emoji, ct);

            case "create_text_file":
                var filePath = call.GetOrDefault<string>("filePath");
                var content = call.GetOrDefault<string>("content");
                if (filePath is null || content is null)
                    return Result.Error("Invalid parameters for create_text_file");
                return await toolsService.CreateTextFileAsync(filePath, content, ct);
            
            // TODO: add other tools
            default:
                return Result.Error($"Unknown function: {call.Name}");
        }
    }
}
