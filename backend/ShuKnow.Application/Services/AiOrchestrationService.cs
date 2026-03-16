using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Application.Services;

internal class AiOrchestrationService(
    IChatService chatService,
    IPromptPreparationService promptPreparationService,
    ISettingsService settingsService,
    IFolderService folderService,
    IFileService fileService,
    IAiService aiService,
    IActionTrackingService actionTrackingService,
    IClassificationParser classificationParser,
    IChatNotificationService chatNotificationService,
    ICurrentUserService currentUserService)
    : IAiOrchestrationService
{
    public Task<Result<UserAction>> ProcessMessageAsync(
        ChatMessage userMessage, 
        IReadOnlyCollection<ChatAttachment>? attachments, 
        string callerConnectionId,
        CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}
