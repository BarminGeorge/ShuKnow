using Ardalis.Result;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Saunter.Attributes;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models.Notifications;
using ShuKnow.WebAPI.Dto.Files;
using ShuKnow.WebAPI.Events;

namespace ShuKnow.WebAPI.Hubs;

[AsyncApi]
[Authorize]
public class ChatHub(
    IAiService aiService,
    IChatNotificationService chatNotificationService,
    ISettingsService settingsService,
    IProcessingOperationService operationService,
    ICurrentConnectionService currentConnectionService,
    ILogger<ChatHub> logger) : Hub
{
    private string ConnectionId => currentConnectionService.connectionId;

    #region Client -> Server Operations

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
        finally
        {
            operationService.CompleteOperation(ConnectionId);
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
        var processingResult = await settingsService.GetOrCreateAsync(ct)
            .BindAsync(settings
                => aiService.ProcessMessageAsync(command.Content, command.AttachmentIds, settings, operationId, ct));

        if (processingResult.IsSuccess)
        {
            await chatNotificationService.SendProcessingCompletedAsync(operationId, CancellationToken.None);
            return;
        }

        if (!processingResult.IsInvalid())
        {
            var errorText = processingResult.Errors.FirstOrDefault() ?? "AI processing failed";
            await chatNotificationService.SendProcessingFailedAsync(operationId, errorText, ct: ct);
            return;
        }

        var validationError = processingResult.ValidationErrors.FirstOrDefault();
        var error = validationError?.ErrorMessage ?? "AI processing failed";
        var errorCode = Enum.TryParse<ChatProcessingErrorCode>(validationError?.ErrorCode, true, out var code)
            ? code
            : ChatProcessingErrorCode.InternalError;

        await chatNotificationService.SendProcessingFailedAsync(operationId, error, errorCode, ct);
    }

    #endregion

    #region Server -> Client Events

    [Channel(nameof(OnValidationFailed))]
    [SubscribeOperation(typeof(ValidationFailedEvent), Summary = "Validation failed for a client request")]
    public void OnValidationFailed(ValidationFailedEvent @event)
    {
    }

    [Channel(nameof(OnProcessingStarted))]
    [SubscribeOperation(typeof(ProcessingStartedEvent), Summary = "AI processing has started")]
    public void OnProcessingStarted(ProcessingStartedEvent @event)
    {
    }

    [Channel(nameof(OnMessageChunk))]
    [SubscribeOperation(typeof(MessageChunkEvent), Summary = "Streaming LLM response chunk or full message payload")]
    public void OnMessageChunk(MessageChunkEvent @event)
    {
    }

    [Channel(nameof(OnMessageCompleted))]
    [SubscribeOperation(typeof(MessageCompletedEvent), Summary = "Streaming LLM response finished successfully")]
    public void OnMessageCompleted(MessageCompletedEvent @event)
    {
    }

    [Channel(nameof(OnFileCreated))]
    [SubscribeOperation(typeof(FileDto), Summary = "A file was created by AI classification")]
    public void OnFileCreated(FileDto file)
    {
    }

    [Channel(nameof(OnFileMoved))]
    [SubscribeOperation(typeof(FileMovedEvent), Summary = "A file was moved by AI classification")]
    public void OnFileMoved(FileMovedEvent @event)
    {
    }

    [Channel(nameof(OnFolderCreated))]
    [SubscribeOperation(typeof(FolderCreatedEvent), Summary = "A new folder was created by AI tools")]
    public void OnFolderCreated(FolderCreatedEvent @event)
    {
    }

    [Channel(nameof(OnTextAppended))]
    [SubscribeOperation(typeof(TextAppendedEvent), Summary = "Text was appended to a file by AI tools")]
    public void OnTextAppended(TextAppendedEvent @event)
    {
    }

    [Channel(nameof(OnTextPrepended))]
    [SubscribeOperation(typeof(TextPrependedEvent), Summary = "Text was prepended to a file by AI tools")]
    public void OnTextPrepended(TextPrependedEvent @event)
    {
    }

    [Channel(nameof(OnAttachmentSaved))]
    [SubscribeOperation(typeof(AttachmentSavedEvent), Summary = "A chat attachment was stored and is ready to use")]
    public void OnAttachmentSaved(AttachmentSavedEvent @event)
    {
    }

    [Channel(nameof(OnProcessingCompleted))]
    [SubscribeOperation(typeof(ProcessingCompletedEvent), Summary = "All AI processing finished successfully")]
    public void OnProcessingCompleted(ProcessingCompletedEvent @event)
    {
    }

    [Channel(nameof(OnProcessingFailed))]
    [SubscribeOperation(typeof(ProcessingFailedEvent), Summary = "AI processing failed")]
    public void OnProcessingFailed(ProcessingFailedEvent @event)
    {
    }

    #endregion

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        operationService.CancelOperation(ConnectionId);
        return base.OnDisconnectedAsync(exception);
    }
}