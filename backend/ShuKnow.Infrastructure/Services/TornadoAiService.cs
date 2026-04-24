using Ardalis.Result;
using LlmTornado.Chat;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ShuKnow.Application.Common;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models.Notifications;
using ShuKnow.Domain.Entities;
using ShuKnow.Infrastructure.Extensions;
using ShuKnow.Infrastructure.Misc;
using static ShuKnow.Application.Extensions.ResultExtensions;
using ChatMessage = ShuKnow.Domain.Entities.ChatMessage;

namespace ShuKnow.Infrastructure.Services;

public class TornadoAiService(
    TornadoPromptBuilder promptBuilder,
    IAttachmentService attachmentService,
    IChatService chatService,
    TornadoToolsService toolsService,
    IChatNotificationService notificationService,
    ITornadoConversationFactory conversationFactory,
    IOptions<TornadoAiOptions> options,
    ILogger<TornadoAiService> logger) : IAiService
{
    private readonly double temperature = options.Value.Temperature;
    private readonly int maxTurns = options.Value.MaxTurns;
    private const string DefaultProcessingErrorMessage = "Error while processing message";

    [Obsolete("Use ProcessMessageAsync with an explicit session id.")]
    public async Task<Result> ProcessMessageAsync(string content, IReadOnlyCollection<Guid>? attachmentIds,
        UserAiSettings settings, Guid operationId, CancellationToken ct = default)
    {
        return await chatService.CreateSessionAsync(ct)
            .BindAsync(session => ProcessMessageAsync(session.Id, content, attachmentIds, settings, operationId, ct));
    }
    
    public async Task<Result> ProcessMessageAsync(Guid sessionId, string content, IReadOnlyCollection<Guid>? attachmentIds,
        UserAiSettings settings, Guid operationId, CancellationToken ct = default)
    {
        return await chatService.GetSessionAsync(sessionId, ct)
            .BindAsync(session => chatService.GetMessagesAsync(session.Id, ct)
                .Map(previousMessages => new ConversationContext(
                    session,
                    previousMessages,
                    ChatMessage.CreateUserMessage(session.Id, content))))
            .BindAsync(context => conversationFactory.CreateConversation(settings, toolsService.Tools, temperature)
                .ActAsync(_ => chatService.PersistMessageAsync(context.UserMessage, ct))
                .ActAsync(conversation => PrepareConversation(
                    conversation,
                    context.PreviousMessages,
                    context.UserMessage.Content,
                    attachmentIds,
                    ct))
                .BindAsync(conversation => RunWithTools(conversation, context.Session.Id, operationId, ct)
                    .ActAsync(_ => attachmentIds is null or { Count: 0 }
                        ? Task.FromResult(Result.Success())
                        : attachmentService.MarkConsumedAsync(attachmentIds, ct))
                    .ActAsync(messages => chatService.PersistMessagesAsync(messages, ct)))
            )
            .BindAsync(_ => Result.Success());
    }

    public async Task<UserAiSettings> TestConnectionAsync(UserAiSettings settings, CancellationToken ct = default)
    {
        var testResult = await conversationFactory.CreateSimpleConversation(settings)
            .BindAsync(conversation => LatencyMeasureUtil.MeasureAsync(() => RunConnectionTest(conversation, ct)));

        var latency = testResult.IsSuccess ? (int?)testResult.Value : null;
        var error = testResult.IsSuccess ? null : testResult.GetFirstErrorOrDefault(DefaultProcessingErrorMessage);

        settings.UpdateTestResult(testResult.IsSuccess, latency, error);
        return settings;
    }

    private async Task<Result> PrepareConversation<T>(T conversation,
        IReadOnlyCollection<ChatMessage> previousMessages,
        string content,
        IReadOnlyCollection<Guid>? attachmentIds, CancellationToken ct = default) where T : ITornadoConversation
    {
        return await promptBuilder.CreateSystemInstructions(ct)
            .Act(conversation.PrependSystemMessage)
            .Act(_ => conversation.AddMessages(previousMessages.Select(message => message.MapToChatMessagePart())))
            .BindAsync(_ => promptBuilder.CreateUserMessages(content, attachmentIds, ct))
            .Act(conversation.AddUserMessage)
            .BindAsync(_ => Result.Success());
    }
    
    private async Task<Result<List<ChatMessage>>> RunWithTools(
        ITornadoConversation conversation, Guid sessionId, Guid operationId, CancellationToken ct = default)
    {
        var aiMessages = new List<ChatMessage>();

        for (var _ = 0; _ < maxTurns; _++)
        {
            var messageId = Guid.NewGuid();
            var result = await StreamResponseWithToolsAsync(conversation, operationId, messageId, ct);
            if (!result.IsSuccess)
                return result.Map();

            var (response, callsCount) = result.Value;
            await notificationService.SendMessageCompletedAsync(operationId, messageId, ct);

            if (!string.IsNullOrEmpty(response))
            {
                var message = ChatMessage.CreateAiMessage(messageId, sessionId, response);
                aiMessages.Add(message);
            }

            if (callsCount == 0)
                return aiMessages;
        }

        return Invalid($"Agent did not converge after {maxTurns} iterations",
            ChatProcessingErrorCode.LlmInvalidResponse);
    }

    private async Task<Result<(string response, int toolCalls)>> StreamResponseWithToolsAsync(
        ITornadoConversation conversation, Guid operationId, Guid messageId, CancellationToken ct)
    {
        try
        {
            return await conversation.StreamResponseWithToolsAsync(
                toolsService.DispatchToolCalls,
                async tokens => await notificationService.SendMessageChunkAsync(operationId, messageId, tokens, ct),
                ct);
        }
        catch (HttpRequestException e)
        {
            logger.LogError(e, "LLM internal error");
            return Invalid($"LLM internal error: {e.StatusCode} '{e.Message}'", ChatProcessingErrorCode.LlmInvalidResponse);
        }
    }

    private async Task<Result<string>> RunConnectionTest(ITornadoConversation conversation,
        CancellationToken ct = default)
    {
        conversation.AddUserMessage([new ChatMessagePart("Say 'ok' to confirm the connection works.")]);
        var response = await conversation.GetResponseAsync(ct);
        if (response.Exception is null && response.HasData)
            return Result.Success(response.Text ?? string.Empty);

        logger.LogError(response.Exception, "Error while processing message with Tornado API");
        return Result.Error("Error while processing message");
    }

    private sealed record ConversationContext(
        ChatSession Session,
        IReadOnlyCollection<ChatMessage> PreviousMessages,
        ChatMessage UserMessage);
}
