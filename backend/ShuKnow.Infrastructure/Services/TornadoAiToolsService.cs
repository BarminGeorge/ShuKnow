using Ardalis.Result;
using LlmTornado.ChatFunctions;
using LlmTornado.Code;
using LlmTornado.Common;
using ShuKnow.Application.Interfaces;

namespace ShuKnow.Infrastructure.Services;

public class TornadoAiToolsService(IAiToolsService toolsService)
{
    public List<Tool> Tools { get; } =
    [
        CreateTool(toolsService.CreateFolderAsync, "create_folder"),
        CreateTool(toolsService.CreateTextFileAsync, "create_text_file"),
        // TODO: add other tools
    ];

    private static Tool CreateTool(Delegate function, string name)
    {
        return new Tool(function, name, new ToolMetadata { Ignore = ["ct"] });
    }
    
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