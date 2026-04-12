namespace ShuKnow.Infrastructure.Services;

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