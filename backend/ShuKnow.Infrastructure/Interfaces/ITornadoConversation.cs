using LlmTornado.Chat;
using LlmTornado.ChatFunctions;

namespace ShuKnow.Infrastructure.Services;

public interface ITornadoConversation
{
    void PrependSystemMessage(string instructions);

    void AddMessages(IEnumerable<ChatMessage> messages);

    void AddUserMessage(IEnumerable<ChatMessagePart> parts);

    Task<TornadoConversationResponse> GetResponseWithToolsAsync(
        Func<List<FunctionCall>, CancellationToken, ValueTask> handleToolCalls,
        CancellationToken ct = default);

    Task<TornadoConversationResponse> GetResponseAsync(CancellationToken ct = default);

    Task<(string response, int toolCalls)> StreamResponseWithToolsAsync(
        Func<List<FunctionCall>, CancellationToken, ValueTask> toolCallsHandler,
        Func<string, ValueTask> tokensHandler,
        CancellationToken ct = default);
}