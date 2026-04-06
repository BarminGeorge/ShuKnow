using Ardalis.Result;
using LlmTornado;
using LlmTornado.Chat;
using LlmTornado.Chat.Models;
using Microsoft.Extensions.Logging;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Extensions;
using ShuKnow.Infrastructure.Extensions;
using ShuKnow.Infrastructure.Misc;
using ChatMessage = ShuKnow.Domain.Entities.ChatMessage;

namespace ShuKnow.Infrastructure.Services;

public class TornadoAiService(
    TornadoPromptBuilder promptBuilder,
    IEncryptionService encryptionService,
    IChatService chatService,
    TornadoAiToolsService toolsService,
    ILogger<TornadoAiService> logger)
{
    private const double Temperature = 0.3;
    private const int MaxTurns = 10;

    public async Task<Result> ProcessMessageAsync(string content, IReadOnlyCollection<Guid>? attachmentIds,
        UserAiSettings settings, CancellationToken ct = default)
    {
        return await chatService.GetOrCreateActiveSessionAsync(ct)
            .BindAsync(session => CreateConversation(settings)
                .ActAsync(conversation => promptBuilder.CreateSystemInstructions(ct)
                    .Act(instructions => conversation.PrependSystemMessage(instructions)))
                .ActAsync(conversation => promptBuilder.GetPreviousMessages(ct)
                    .Act(messages => conversation.AddMessage(messages)))
                .ActAsync(conversation => promptBuilder.CreateUserMessages(content, attachmentIds, ct)
                    .Act(parts => conversation.AddUserMessage(parts)))
                .BindAsync(conversation => RunWithTools(conversation, ct))
                .ActAsync(_ => chatService.PersistMessageAsync(ChatMessage.CreateUserMessage(session.Id, content), ct))
                .ActAsync(response =>
                    chatService.PersistMessageAsync(ChatMessage.CreateAiMessage(session.Id, response), ct))
            )
            .BindAsync(_ => Result.Success());
    }

    public async Task<UserAiSettings> TestConnectionAsync(UserAiSettings settings, CancellationToken ct = default)
    {
        var testResult = await CreateSimpleConversation(settings)
            .BindAsync(conversation => LatencyMeasureUtil.MeasureAsync(() => RunConnectionTest(conversation, ct)));

        var latency = testResult.IsSuccess ? (int?)testResult.Value : null;
        var error = testResult.IsSuccess ? null : testResult.Errors.FirstOrDefault();
        
        settings.UpdateTestResult(testResult.IsSuccess, latency, error);
        return settings;
    }

    private Result<Conversation> CreateConversation(UserAiSettings settings)
    {
        // TODO: add reasoning helper to add reasoning according to specified provider
        return CreateApi(settings)
            .Map(api => api.Chat.CreateConversation(new ChatRequest
            {
                Model = new ChatModel(settings.ModelId, api.GetFirstAuthenticatedProvider()),
                Tools = toolsService.Tools,
                Temperature = Temperature
            }));
    }

    private Result<Conversation> CreateSimpleConversation(UserAiSettings settings)
    {
        return CreateApi(settings)
            .Map(api => api.Chat.CreateConversation(new ChatRequest
            {
                Model = new ChatModel(settings.ModelId, api.GetFirstAuthenticatedProvider())
            }));
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
            var safeResponse = await conversation.GetResponseRichSafe(async calls =>
                await toolsService.DispatchToolCalls(calls, ct), ct);
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

    private async Task<Result<string>> RunConnectionTest(Conversation conversation, CancellationToken ct = default)
    {
        var safeResponse = await conversation.GetResponseRichSafe(ct);
        if (safeResponse.Exception is null && safeResponse.Data is not null)
            return Result.Success(safeResponse.Data.Text);
        
        logger.LogError(safeResponse.Exception, "Error while processing message with Tornado API");
        return Result.Error("Error while processing message");
    }
}