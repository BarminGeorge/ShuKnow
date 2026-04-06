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
}

public sealed record TornadoConversationResponse(
    string? Text,
    bool ContainsFunctionCalls,
    bool HasData,
    Exception? Exception = null)
{
    public static TornadoConversationResponse Success(string? text, bool containsFunctionCalls)
    {
        return new TornadoConversationResponse(text, containsFunctionCalls, true);
    }

    public static TornadoConversationResponse Failure(Exception? exception = null)
    {
        return new TornadoConversationResponse(null, false, false, exception);
    }
}
