using Microsoft.AspNetCore.Http;
using DomainFile = ShuKnow.Domain.Entities.File;

namespace ShuKnow.WebAPI.Mappers;

public static class FileRequestMappers
{
    public static DomainFile ToModel(
        this IFormFile file,
        Guid userId,
        Guid? folderId,
        string? name,
        string? description)
    {
        return new DomainFile(
            Guid.NewGuid(),
            userId,
            folderId,
            name ?? file.FileName,
            description ?? string.Empty,
            file.ContentType,
            file.Length);
    }
}
