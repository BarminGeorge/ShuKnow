namespace PPshu.Application.Common;

public class JwtOptions
{
    public string Key { get; set; } = "";
    public int ExpiresInMinutes { get; set; } = 60;
    public string Issuer { get; set; } = "";
    public string Audience { get; set; } = "";

    public JwtOptions Validate()
    {
        if (string.IsNullOrEmpty(Key))
            throw new InvalidOperationException("JWT__KEY is not configured");
        
        if (string.IsNullOrEmpty(Issuer))
            throw new InvalidOperationException("JWT__ISSUER is not configured");
        
        if (string.IsNullOrEmpty(Audience))
            throw new InvalidOperationException("JWT__AUDIENCE is not configured");

        return this;
    }
}