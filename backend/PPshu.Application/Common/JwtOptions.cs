namespace PPshu.Application.Common;

public class JwtOptions
{
    public const string SectionName = "Jwt";
    
    public string Key { get; set; } = "";
    public int ExpiresInMinutes { get; set; } = 60;
    public string Issuer { get; set; } = "";
    public string Audience { get; set; } = "";

    public JwtOptions Validate()
    {
        if (string.IsNullOrEmpty(Key))
            throw new InvalidOperationException($"{SectionName}:Key is not configured");
        
        if (string.IsNullOrEmpty(Issuer))
            throw new InvalidOperationException($"{SectionName}:Issuer is not configured");
        
        if (string.IsNullOrEmpty(Audience))
            throw new InvalidOperationException($"{SectionName}:Audience is not configured");

        return this;
    }
}