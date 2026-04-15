using Ardalis.Result;
using LlmTornado.Chat;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ShuKnow.Application.Common;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.Infrastructure.Misc;
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

    public async Task<Result> ProcessMessageAsync(string content, IReadOnlyCollection<Guid>? attachmentIds,
        UserAiSettings settings, Guid operationId, CancellationToken ct = default)
    {
        return await chatService.GetOrCreateActiveSessionAsync(ct)
            .BindAsync(session => conversationFactory.CreateConversation(settings, toolsService.Tools, temperature)
                .ActAsync(conversation => PrepareConversation(conversation, content, attachmentIds, ct))
                .BindAsync(conversation => RunWithTools(conversation, session.Id, operationId, ct))
                .ActAsync(_ => attachmentIds is null or { Count: 0 }
                    ? Task.FromResult(Result.Success())
                    : attachmentService.MarkConsumedAsync(attachmentIds, ct))
                .ActAsync(_ => chatService.PersistMessageAsync(ChatMessage.CreateUserMessage(session.Id, content), ct))
                .ActAsync(messages => chatService.PersistMessagesAsync(messages, ct))
            )
            .BindAsync(_ => Result.Success());
    }

    public async Task<UserAiSettings> TestConnectionAsync(UserAiSettings settings, CancellationToken ct = default)
    {
        var testResult = await conversationFactory.CreateSimpleConversation(settings)
            .BindAsync(conversation => LatencyMeasureUtil.MeasureAsync(() => RunConnectionTest(conversation, ct)));

        var latency = testResult.IsSuccess ? (int?)testResult.Value : null;
        var error = testResult.IsSuccess ? null : testResult.Errors.FirstOrDefault();

        settings.UpdateTestResult(testResult.IsSuccess, latency, error);
        return settings;
    }

    private async Task<Result> PrepareConversation<T>(T conversation, string content,
        IReadOnlyCollection<Guid>? attachmentIds, CancellationToken ct = default) where T : ITornadoConversation
    {
        var systemTask = promptBuilder.CreateSystemInstructions(ct);
        var historyTask = promptBuilder.GetPreviousMessages(ct);
        var userTask = promptBuilder.CreateUserMessages(content, attachmentIds, ct);

        await Task.WhenAll(systemTask, historyTask, userTask);

        return systemTask.Result
            .Act(conversation.PrependSystemMessage)
            .Act(_ => historyTask.Result.Act(conversation.AddMessages))
            .Act(_ => userTask.Result.Act(conversation.AddUserMessage))
            .Map();
    }

    private async Task<Result<List<ChatMessage>>> RunWithTools(
        ITornadoConversation conversation, Guid sessionId, Guid operationId, CancellationToken ct = default)
    {
        var aiMessages = new List<ChatMessage>();
        
        for (var _ = 0; _ < maxTurns; _++)
        {
            var response = await conversation.GetResponseWithToolsAsync(
                toolsService.DispatchToolCalls,
                ct);
            if (response.Exception is not null || !response.HasData)
            {
                logger.LogError(response.Exception, "Error while processing message with Tornado API");
                return Result.Error("Error while processing message");
            }

            var message = ChatMessage.CreateAiMessage(sessionId, response.Text ?? string.Empty);
            aiMessages.Add(message);
            await notificationService.SendMessageChunkAsync(operationId, message.Id, response.Text ?? "", ct);
            await notificationService.SendMessageCompletedAsync(operationId, message.Id, ct);

            if (!response.ContainsFunctionCalls)
                return aiMessages;
        }

        return Result.Error($"Agent did not converge after {maxTurns} iterations");
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
}