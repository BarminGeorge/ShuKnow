using Ardalis.Result;
using Microsoft.Extensions.Logging;
using Saunter.Attributes;
using ShuKnow.Application.Extensions;
using ShuKnow.Application.Models.Notifications;
using ShuKnow.WebAPI.Events;

namespace ShuKnow.WebAPI.Hubs;

public partial class ChatHub
{
    [Channel(nameof(SendMessage))]
    [PublishOperation(typeof(SendMessageCommand), Summary = "Submit user content for AI classification")]
    public async Task SendMessage(SendMessageCommand command)
    {
        var (operationId, ctSource) = operationService.BeginOperation(ConnectionId);
        var ct = ctSource.Token;

        try
        {
            await TryProcessMessage(command, operationId, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            logger.LogInformation("Chat processing cancelled for connection {ConnectionId}", ConnectionId);
        }
        catch (Exception e)
        {
            logger.LogError(e, "Chat processing failed for connection {ConnectionId}", ConnectionId);
            await chatNotificationService.SendProcessingFailedAsync(
                operationId,
                "processing failed.",
                ChatProcessingErrorCode.InternalError,
                ct);
        }
        finally
        {
            operationService.CompleteOperation(ConnectionId, operationId);
        }
    }

    [Channel(nameof(CancelProcessing))]
    [PublishOperation(typeof(void), Summary = "Cancel in-flight AI processing")]
    public Task CancelProcessing()
    {
        operationService.CancelOperation(ConnectionId);
        return Task.CompletedTask;
    }

    private async Task TryProcessMessage(SendMessageCommand command, Guid operationId, CancellationToken ct)
    {
        await chatNotificationService.SendProcessingStartedAsync(operationId, ct);

        var content = string.IsNullOrEmpty(command.Content) ? "Save this content" : command.Content;
        
        var processingResult = await settingsService.GetOrCreateAsync(ct)
            .BindAsync(settings => aiService.ProcessMessageAsync(
                    command.SessionId,
                    content,
                    command.AttachmentIds,
                    settings,
                    operationId,
                    ct));
        await NotifyProcessingResultAsync(operationId, processingResult, ct);
    }

    private async Task NotifyProcessingResultAsync(Guid operationId, Result processingResult, CancellationToken ct)
    {
        if (processingResult.IsSuccess)
        {
            await chatNotificationService.SendProcessingCompletedAsync(operationId, CancellationToken.None);
            return;
        }

        await chatNotificationService.SendProcessingFailedAsync(
            operationId,
            processingResult.GetFirstErrorOrDefault(DefaultProcessingErrorMessage),
            processingResult.GetChatProcessingErrorCodeOrDefault(),
            ct);
    }
}
