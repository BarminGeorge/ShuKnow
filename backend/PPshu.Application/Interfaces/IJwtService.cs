namespace PPshu.Application.Interfaces;

public interface IJwtService
{
    string GenerateToken(Guid userId);
}