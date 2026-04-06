using Ardalis.Result;
using LlmTornado.Common;
using ShuKnow.Domain.Entities;

namespace ShuKnow.Infrastructure.Services;

public interface ITornadoConversationFactory
{
    Result<ITornadoConversation> CreateConversation(
        UserAiSettings settings,
        IReadOnlyCollection<Tool> tools,
        double temperature);

    Result<ITornadoConversation> CreateSimpleConversation(UserAiSettings settings);
}