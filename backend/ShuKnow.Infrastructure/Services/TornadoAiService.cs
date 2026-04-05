using Ardalis.Result;
using LlmTornado;
using LlmTornado.Chat;
using LlmTornado.Chat.Models;
using LlmTornado.ChatFunctions;
using LlmTornado.Code;
using LlmTornado.Common;
using Microsoft.Extensions.Logging;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Extensions;
using ShuKnow.Infrastructure.Extensions;
using ChatMessage = ShuKnow.Domain.Entities.ChatMessage;
using TornadoChatMessage = LlmTornado.Chat.ChatMessage;

namespace ShuKnow.Infrastructure.Services;

public class TornadoAiService(
    IAttachmentService attachmentService,
    ISettingsService settingsService,
    IEncryptionService encryptionService,
    IChatService chatService,
    IAiToolsService toolsService,
    ILogger<TornadoAiService> logger)
{
    private const double Temperature = 0.3;
    private const int MaxTurns = 10;

    private readonly List<Tool> tools =
    [
        new(toolsService.CreateFolderAsync, "create_folder", new ToolMetadata { Ignore = ["ct"] }),
        new(toolsService.CreateTextFileAsync, "create_text_file", new ToolMetadata { Ignore = ["ct"] }),
        // TODO: add other tools
    ];

    public async Task<Result> ProcessMessageAsync(string content, IReadOnlyCollection<Guid>? attachmentIds,
        CancellationToken ct = default)
    {
        return await chatService.GetOrCreateActiveSessionAsync(ct)
            .BindAsync(session => CreateConversation(ct)
                .ActAsync(conversation => CreateSystemInstructions(ct)
                    .Act(instructions => conversation.PrependSystemMessage(instructions)))
                .ActAsync(conversation => GetPreviousMessages(ct)
                    .Act(messages => conversation.AddMessage(messages)))
                .ActAsync(conversation => CreateUserMessages(content, attachmentIds, ct)
                    .Act(parts => conversation.AddUserMessage(parts)))
                .BindAsync(conversation => RunWithTools(conversation, ct))
                .ActAsync(_ => chatService.PersistMessageAsync(ChatMessage.CreateUserMessage(session.Id, content), ct))
                .ActAsync(response =>
                    chatService.PersistMessageAsync(ChatMessage.CreateAiMessage(session.Id, response), ct))
            )
            .BindAsync(_ => Result.Success());
    }

    private async Task<Result<string>> CreateSystemInstructions(CancellationToken ct = default)
    {
        // TODO: implement prompt building (with current folder structure)
        return Result.Success("Ты - помощник с файлами и информацией. Используя выданные тебе tools, сохрани переданную тебе информацию");
    }

    private async Task<Result<IEnumerable<TornadoChatMessage>>> GetPreviousMessages(CancellationToken ct = default)
    {   
        return await chatService.GetMessagesAsync(ct)
            .MapAsync(messages => messages
                .Select(message => message.MapToChatMessagePart()));
    }

    private async Task<Result<List<ChatMessagePart>>> CreateUserMessages(
        string content, IReadOnlyCollection<Guid>? attachmentIds, CancellationToken ct = default)
    {
        var messageParts = new List<ChatMessagePart> { new(content) };
        if (attachmentIds is null || attachmentIds.Count == 0)
            return Result.Success(messageParts);

        return await attachmentService.GetByIdsAsync(attachmentIds, ct)
            .MapAsync(attachments =>
            {
                foreach (var attachment in attachments)
                {
                    messageParts.Add(new ChatMessagePart($"File: `{attachment.FileName}`"));
                    // TODO: add blob (after rebase on main)
                }

                return messageParts;
            });
    }

    private async Task<Result<Conversation>> CreateConversation(CancellationToken ct = default)
    {
        // TODO: add reasoning helper to add reasoning according to specified provider
        return await settingsService.GetOrCreateAsync(ct)
            .BindAsync(settings => CreateApi(settings)
                .Map(api => api.Chat.CreateConversation(new ChatRequest
                {
                    Model = new ChatModel(settings.ModelId),
                    Tools = tools,
                    Temperature = Temperature
                })));
    }

    private Result<TornadoApi> CreateApi(UserAiSettings settings)
    {
        if (string.IsNullOrEmpty(settings.ApiKeyEncrypted))
            return Result.Error("API key is not configured");

        return encryptionService.Decrypt(settings.ApiKeyEncrypted)
            .Bind(apiKey => settings.Provider.MapToLlmProviders()
                .Bind(provider => settings.ParseBaseUrl()
                    .Map(uri => uri is null
                        ? new TornadoApi(provider, apiKey)
                        : new TornadoApi(uri, apiKey, provider))));
    }

    private async Task<Result<string>> RunWithTools(Conversation conversation, CancellationToken ct = default)
    {
        for (var _ = 0; _ < MaxTurns; _++)
        {
            var safeResponse =
                await conversation.GetResponseRichSafe(async calls => await DispatchToolCalls(calls, ct), ct);
            if (safeResponse.Exception is not null || safeResponse.Data is null)
            {
                logger.LogError(safeResponse.Exception, "Error while processing message with Tornado API");
                return Result.Error("Error while processing message");
            }

            var response = safeResponse.Data;
            if (response.Blocks.All(b => b.Type is not ChatRichResponseBlockTypes.Function))
                return Result.Success(response.Text);
        }

        return Result.Error($"Agent did not converge after {MaxTurns} iterations");
    }

    private async ValueTask DispatchToolCalls(List<FunctionCall> calls, CancellationToken ct = default)
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