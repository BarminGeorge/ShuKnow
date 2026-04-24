using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Saunter.Attributes;
using ShuKnow.Application.Interfaces;

namespace ShuKnow.WebAPI.Hubs;

[AsyncApi]
[Authorize]
public partial class ChatHub(
    IAiService aiService,
    IChatNotificationService chatNotificationService,
    ISettingsService settingsService,
    IProcessingOperationService operationService,
    ICurrentConnectionService currentConnectionService,
    ILogger<ChatHub> logger) : Hub
{
    private const string DefaultProcessingErrorMessage = "AI processing failed";

    private string ConnectionId => currentConnectionService.connectionId;

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        return base.OnDisconnectedAsync(exception);
    }
}
