using Ardalis.Result;
using LlmTornado.Code;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Enums;
using TornadoChatMessage = LlmTornado.Chat.ChatMessage;

namespace ShuKnow.Infrastructure.Extensions;

public static class TornadoMappers
{
    public static Result<LLmProviders> MapToLlmProviders(this AiProvider provider)
    {
        LLmProviders? result = provider switch
        {
            AiProvider.Unknown => null,
            AiProvider.OpenAI => LLmProviders.OpenAi,
            AiProvider.OpenRouter => LLmProviders.OpenRouter,
            AiProvider.Gemini => LLmProviders.Google,
            AiProvider.Anthropic => LLmProviders.Anthropic,
            _ => null
        };

        return result is not null ? Result.Success(result.Value) : Result.Error($"Unknown AI provider '{provider}'");
    }

    public static TornadoChatMessage MapToChatMessagePart(this ChatMessage message)
    {
        return new TornadoChatMessage(message.Role.MapToChatMessageRoles(), message.Content);
    }

    public static ChatMessageRoles MapToChatMessageRoles(this ChatMessageRole role)
    {
        return role switch
        {
            ChatMessageRole.Unknown => ChatMessageRoles.Unknown,
            ChatMessageRole.User => ChatMessageRoles.User,
            ChatMessageRole.Ai => ChatMessageRoles.Assistant,
            ChatMessageRole.System => ChatMessageRoles.System,
            _ => throw new ArgumentOutOfRangeException(nameof(role), role, null)
        };
    }

    public static Result<ChatAudioFormats> MapToAudioFormat(this string mimeType)
    {
        return mimeType switch
        {
            "audio/mpeg" => ChatAudioFormats.Mp3,
            "audio/wav" => ChatAudioFormats.Wav,
            "audio/L16" => ChatAudioFormats.L16,
            _ => Result.Invalid(new ValidationError($"Unsupported audio MIME type: {mimeType}"))
        };
    }
}