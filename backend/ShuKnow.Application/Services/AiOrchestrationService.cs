using Ardalis.Result;
using ShuKnow.Application.Interfaces;

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
    public Task<Result> ProcessMessageAsync(
        string content,
        string? context,
        IReadOnlyCollection<Guid>? attachmentIds,
        string callerConnectionId,
        CancellationToken ct = default)
    {
        throw new NotImplementedException();
    }
}
