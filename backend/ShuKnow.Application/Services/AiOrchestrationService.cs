using Ardalis.Result;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Repositories;

namespace ShuKnow.Application.Services;

internal class AiOrchestrationService(
    IChatService chatService,
    IAttachmentService attachmentService,
    ISettingsService settingsService,
    IFolderService folderService,
    IFileService fileService,
    IFolderRepository folderRepository,
    IAiService aiService,
    IActionRepository actionRepository,
    IPromptBuilder promptBuilder,
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
