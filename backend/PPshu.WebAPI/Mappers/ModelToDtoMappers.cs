using PPshu.Domain.Entities;
using PPshu.WebAPI.Dto;

namespace PPshu.WebAPI.Mappers;

public static class ModelToDtoMappers
{
    public static UserDto ToDto(this User user)
    {
        return new UserDto(user.Id);
    }
}