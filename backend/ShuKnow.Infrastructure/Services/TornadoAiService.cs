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
using ChatMessage = ShuKnow.Domain.Entities.ChatMessage;

namespace ShuKnow.Infrastructure.Services;

public class TornadoAiService(
    TornadoPromptBuilder promptBuilder,
    ISettingsService settingsService,
    IEncryptionService encryptionService,
    IChatService chatService,
    TornadoAiToolsService toolsService,
    ILogger<TornadoAiService> logger)
{
    private const double Temperature = 0.3;
    private const int MaxTurns = 10;

    public async Task<Result> ProcessMessageAsync(string content, IReadOnlyCollection<Guid>? attachmentIds,
        CancellationToken ct = default)
    {
        return await chatService.GetOrCreateActiveSessionAsync(ct)
            .BindAsync(session => CreateConversation(ct)
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

    private async Task<Result<Conversation>> CreateConversation(CancellationToken ct = default)
    {
        // TODO: add reasoning helper to add reasoning according to specified provider
        return await settingsService.GetOrCreateAsync(ct)
            .BindAsync(settings => CreateApi(settings)
                .Map(api => api.Chat.CreateConversation(new ChatRequest
                {
                    Model = new ChatModel(settings.ModelId, api.GetFirstAuthenticatedProvider()),
                    Tools = toolsService.Tools,
                    Temperature = Temperature
                })));
    }

    private async Task<Result<Conversation>> CreateSimpleConversation(CancellationToken ct = default)
    {
        return await settingsService.GetOrCreateAsync(ct)
            .BindAsync(settings => CreateApi(settings)
                .Map(api => api.Chat.CreateConversation(new ChatRequest
                {
                    Model = new ChatModel(settings.ModelId, api.GetFirstAuthenticatedProvider())
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
}