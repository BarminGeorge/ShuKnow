using ShuKnow.Domain.Entities;
using ShuKnow.WebAPI.Dto.Auth;
using ShuKnow.WebAPI.Dto.Chat;
using ApiChatMessageRole = ShuKnow.WebAPI.Dto.Enums.ChatMessageRole;
using ApiChatSessionStatus = ShuKnow.WebAPI.Dto.Enums.ChatSessionStatus;

namespace ShuKnow.WebAPI.Mappers;

public static class ModelToDtoMappers
{
    public static UserDto ToDto(this User user)
    {
        return new UserDto(user.Id, user.Login);
    }

    public static ChatSessionDto ToDto(this ChatSession session)
    {
        return new ChatSessionDto(
            session.Id,
            (ApiChatSessionStatus)session.Status,
            0,
            false);
    }

    public static ChatMessageDto ToDto(this ChatMessage message)
    {
        return new ChatMessageDto(
            message.Id,
            (ApiChatMessageRole)message.Role,
            message.Content,
            message.Index,
            null);
    }
}
