using Ardalis.Result;
using Microsoft.Extensions.Logging;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.Infrastructure.Misc;
using ChatMessage = ShuKnow.Domain.Entities.ChatMessage;

namespace ShuKnow.Infrastructure.Services;

public class TornadoAiService(
    TornadoPromptBuilder promptBuilder,
    IChatService chatService,
    TornadoToolsService toolsService,
    ITornadoConversationFactory conversationFactory,
    ILogger<TornadoAiService> logger)
{
    private const double Temperature = 0.3;
    private const int MaxTurns = 10;

    public async Task<Result> ProcessMessageAsync(string content, IReadOnlyCollection<Guid>? attachmentIds,
        UserAiSettings settings, CancellationToken ct = default)
    {
        return await chatService.GetOrCreateActiveSessionAsync(ct)
            .BindAsync(session => conversationFactory.CreateConversation(settings, toolsService.Tools, Temperature)
                .ActAsync(conversation => promptBuilder.CreateSystemInstructions(ct)
                    .Act(instructions => conversation.PrependSystemMessage(instructions)))
                .ActAsync(conversation => promptBuilder.GetPreviousMessages(ct)
                    .Act(messages => conversation.AddMessages(messages)))
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
        var testResult = await conversationFactory.CreateSimpleConversation(settings)
            .BindAsync(conversation => LatencyMeasureUtil.MeasureAsync(() => RunConnectionTest(conversation, ct)));

        var latency = testResult.IsSuccess ? (int?)testResult.Value : null;
        var error = testResult.IsSuccess ? null : testResult.Errors.FirstOrDefault();
        
        settings.UpdateTestResult(testResult.IsSuccess, latency, error);
        return settings;
    }

    private async Task<Result<string>> RunWithTools(ITornadoConversation conversation, CancellationToken ct = default)
    {
        for (var _ = 0; _ < MaxTurns; _++)
        {
            var response = await conversation.GetResponseWithToolsAsync(
                (calls, callbackCt) => toolsService.DispatchToolCalls(calls, callbackCt),
                ct);
            if (response.Exception is not null || !response.HasData)
            {
                logger.LogError(response.Exception, "Error while processing message with Tornado API");
                return Result.Error("Error while processing message");
            }

            if (!response.ContainsFunctionCalls)
                return Result.Success(response.Text ?? string.Empty);
        }

        return Result.Error($"Agent did not converge after {MaxTurns} iterations");
    }

    private async Task<Result<string>> RunConnectionTest(ITornadoConversation conversation, CancellationToken ct = default)
    {
        var response = await conversation.GetResponseAsync(ct);
        if (response.Exception is null && response.HasData)
            return Result.Success(response.Text ?? string.Empty);
        
        logger.LogError(response.Exception, "Error while processing message with Tornado API");
        return Result.Error("Error while processing message");
    }
}
