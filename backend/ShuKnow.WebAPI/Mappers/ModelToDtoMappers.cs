using ShuKnow.Domain.Entities;
using ShuKnow.WebAPI.Dto.Auth;

namespace ShuKnow.WebAPI.Mappers;

public static class ModelToDtoMappers
{
    public static UserDto ToDto(this User user)
    {
        return new UserDto(user.Id);
    }
}