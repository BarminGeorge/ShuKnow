using System.Text;
using Ardalis.Result;
using LlmTornado;
using LlmTornado.Chat;
using LlmTornado.Chat.Models;
using LlmTornado.ChatFunctions;
using LlmTornado.Common;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models.Notifications;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Extensions;
using ShuKnow.Infrastructure.Extensions;
using static ShuKnow.Application.Extensions.ResultExtensions;
using TornadoChatMessage = LlmTornado.Chat.ChatMessage;

namespace ShuKnow.Infrastructure.Services;

public class TornadoConversationFactory(IEncryptionService encryptionService)
    : ITornadoConversationFactory
{
    public Result<ITornadoConversation> CreateConversation(
        UserAiSettings settings,
        IReadOnlyCollection<Tool> tools,
        double temperature)
    {
        return CreateApi(settings)
            .Map(api => (ITornadoConversation)new LlmTornadoConversation(api.Chat.CreateConversation(new ChatRequest
            {
                Model = new ChatModel(settings.ModelId, api.GetFirstAuthenticatedProvider()),
                Tools = tools.ToList(),
                Temperature = temperature
            })));
    }

    public Result<ITornadoConversation> CreateSimpleConversation(UserAiSettings settings)
    {
        return CreateApi(settings)
            .Map(api => (ITornadoConversation)new LlmTornadoConversation(api.Chat.CreateConversation(new ChatRequest
            {
                Model = new ChatModel(settings.ModelId, api.GetFirstAuthenticatedProvider())
            })));
    }

    private Result<TornadoApi> CreateApi(UserAiSettings settings)
    {
        if (string.IsNullOrEmpty(settings.ApiKeyEncrypted))
            return Invalid("API key is not configured", ChatProcessingErrorCode.LlmConnectionFailed);

        return encryptionService.Decrypt(settings.ApiKeyEncrypted)
            .Bind(apiKey => settings.Provider.MapToLlmProviders()
                .Bind(provider => settings.ParseBaseUrl()
                    .Map(uri => uri is null
                        ? new TornadoApi(provider, apiKey)
                        : new TornadoApi(uri, apiKey, provider))));
    }
}

public sealed class LlmTornadoConversation(Conversation conversation) : ITornadoConversation
{
    private readonly StringBuilder messageBuffer = new();
    private int currentToolCalls;

    public void PrependSystemMessage(string instructions)
    {
        conversation.PrependSystemMessage(instructions);
    }

    public void AddMessages(IEnumerable<TornadoChatMessage> messages)
    {
        conversation.AddMessage(messages);
    }

    public void AddUserMessage(IEnumerable<ChatMessagePart> parts)
    {
        conversation.AddUserMessage(parts);
    }

    public async Task<(string response, int toolCalls)> StreamResponseWithToolsAsync(
        Func<List<FunctionCall>, CancellationToken, ValueTask> toolCallsHandler,
        Func<string, ValueTask> tokensHandler,
        CancellationToken ct = default)
    {
        CleanBuffer();
        await conversation.StreamResponseRich(async tokens =>
            {
                messageBuffer.Append(tokens);
                if (string.IsNullOrEmpty(tokens))
                    return;
                
                await tokensHandler(tokens);
            },
            async calls =>
            {
                currentToolCalls += calls.Count;
                await toolCallsHandler(calls, ct);
            },
            null,
            token: ct);

        return (messageBuffer.ToString(), currentToolCalls);
    }

    public async Task<TornadoConversationResponse> GetResponseWithToolsAsync(
        Func<List<FunctionCall>, CancellationToken, ValueTask> handleToolCalls,
        CancellationToken ct = default)
    {
        var safeResponse = await conversation.GetResponseRichSafe(
            calls => handleToolCalls(calls, ct),
            ct);

        return MapResponse(safeResponse);
    }

    public async Task<TornadoConversationResponse> GetResponseAsync(CancellationToken ct = default)
    {
        var safeResponse = await conversation.GetResponseRichSafe(ct);
        return MapResponse(safeResponse);
    }

    private void CleanBuffer()
    {
        messageBuffer.Clear();
        currentToolCalls = 0;
    }

    private static TornadoConversationResponse MapResponse(
        RestDataOrException<ChatRichResponse> safeResponse)
    {
        if (safeResponse.Exception is not null || safeResponse.Data is null)
            return TornadoConversationResponse.Failure(safeResponse.Exception);

        return TornadoConversationResponse.Success(
            safeResponse.Data.Text,
            safeResponse.Data.Blocks.Any(block => block.Type is ChatRichResponseBlockTypes.Function));
    }
}