namespace PPshu.Application.Common;

public class JwtOptions
{
    public string Key { get; set; } = "";
    public int ExpiresInMinutes { get; set; } = 60;
}