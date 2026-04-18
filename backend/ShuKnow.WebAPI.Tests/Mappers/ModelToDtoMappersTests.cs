using AwesomeAssertions;
using ShuKnow.Domain.Entities;
using ShuKnow.WebAPI.Mappers;

namespace ShuKnow.WebAPI.Tests.Mappers;

public class ModelToDtoMappersTests
{
    [Test]
    public void ToDto_WhenChatSessionHasMessages_ShouldMapMessageCount()
    {
        var session = new ChatSession(Guid.NewGuid(), Guid.NewGuid());
        var messages = new[]
        {
            ChatMessage.CreateUserMessage(session.Id, "Hello"),
            ChatMessage.CreateAiMessage(session.Id, "Hi")
        };
        SetMessages(session, messages);

        var dto = session.ToDto();

        dto.MessageCount.Should().Be(messages.Length);
        dto.CanRollback.Should().BeFalse();
    }

    private static void SetMessages(ChatSession session, IReadOnlyCollection<ChatMessage> messages)
    {
        typeof(ChatSession)
            .GetProperty(nameof(ChatSession.Messages))!
            .SetValue(session, messages);
    }
}
