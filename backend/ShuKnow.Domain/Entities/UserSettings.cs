using ShuKnow.Domain.Interfaces;

namespace ShuKnow.Domain.Entities;

public class UserSettings : IEntity<Guid>
{
    public Guid Id { get; private set; }
    public string? AiApiKey { get; private set; }

    protected UserSettings()
    {
    }

    public UserSettings(Guid userId)
    {
        Id = userId;
    }

    public void UpdateAiApiKey(string? apiKey)
    {
        AiApiKey = apiKey;
    }
}
