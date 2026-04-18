using ShuKnow.Application.Interfaces;

namespace ShuKnow.WebAPI.Services;

public class CurrentConnectionService : ICurrentConnectionService
{
    private string? currentConnectionId;

    public string connectionId => currentConnectionId
        ?? throw new InvalidOperationException("Connection id is not available for the current hub scope.");

    public void SetConnectionId(string connectionId)
    {
        currentConnectionId = string.IsNullOrWhiteSpace(connectionId)
            ? throw new ArgumentException("Connection id cannot be null or whitespace.", nameof(connectionId))
            : connectionId;
    }
}
