using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Saunter.Attributes;
using ShuKnow.WebAPI.Dto.Chat;
using ShuKnow.WebAPI.Dto.Files;
using ShuKnow.WebAPI.Dto.Folders;
using ShuKnow.WebAPI.Events;

namespace ShuKnow.WebAPI.Hubs;

[AsyncApi]
[Authorize]
public class ChatHub : Hub
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
    public async Task CancelProcessing()
    {
        // TODO: implement
        var operationId = Guid.NewGuid();
        await Clients.Caller.SendAsync(nameof(OnProcessingCancelled), new ProcessingCancelledEvent(operationId));
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
    [SubscribeOperation(typeof(MessageChunkEvent), Summary = "Streaming LLM response token chunk")]
    public void OnMessageChunk(MessageChunkEvent @event)
    {
    }

    [Channel(nameof(OnMessageCompleted))]
    [SubscribeOperation(typeof(ChatMessageDto), Summary = "Full AI message received and persisted")]
    public void OnMessageCompleted(ChatMessageDto message)
    {
    }

    [Channel(nameof(OnClassificationResult))]
    [SubscribeOperation(typeof(ClassificationResultEvent), Summary = "AI classification plan before execution")]
    public void OnClassificationResult(ClassificationResultEvent @event)
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
    [SubscribeOperation(typeof(FolderDto), Summary = "A new folder was created by AI classification")]
    public void OnFolderCreated(FolderDto folder)
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

    [Channel(nameof(OnProcessingCancelled))]
    [SubscribeOperation(typeof(ProcessingCancelledEvent), Summary = "AI processing was cancelled")]
    public void OnProcessingCancelled(ProcessingCancelledEvent @event)
    {
    }

    #endregion
}