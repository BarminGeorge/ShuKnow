using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Saunter.Attributes;
using ShuKnow.Application.Interfaces;
using ShuKnow.Metrics.Services;
using ShuKnow.WebAPI.Dto.Files;
using ShuKnow.WebAPI.Events;

namespace ShuKnow.WebAPI.Hubs;

[AsyncApi]
[Authorize]
public class ChatHub(
    IMetricsService metricsService,
    ICurrentUserService currentUserService)
    : Hub
{
    #region Client -> Server Operations

    [Channel(nameof(SendMessage))]
    [PublishOperation(typeof(SendMessageCommand), Summary = "Submit user content for AI classification")]
    public async Task SendMessage(SendMessageCommand command)
    {
        // TODO: implement
        var operationId = Guid.NewGuid();
        await Clients.Caller.SendAsync(nameof(OnProcessingStarted), new ProcessingStartedEvent(operationId));
    }

    [Channel(nameof(CancelProcessing))]
    [PublishOperation(typeof(void), Summary = "Cancel in-flight AI processing")]
    public Task CancelProcessing()
    {
        // TODO: implement
        return Task.FromResult(Task.CompletedTask);
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

    [Channel(nameof(OnFileCreated))]
    [SubscribeOperation(typeof(FileDto), Summary = "A file was created by AI classification")]
    public async Task OnFileCreated(FileDto file)
    {
        await metricsService.RecordAiItemProcessedAsync(currentUserService.UserId, file.Id);
    }

    [Channel(nameof(OnFileMoved))]
    [SubscribeOperation(typeof(FileMovedEvent), Summary = "A file was moved by AI classification")]
    public async Task OnFileMoved(FileMovedEvent @event)
    {
        await metricsService.RecordAiItemProcessedAsync(currentUserService.UserId, @event.FileId);
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
}