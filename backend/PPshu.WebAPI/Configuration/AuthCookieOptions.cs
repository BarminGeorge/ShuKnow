using Microsoft.AspNetCore.Http;

namespace PPshu.WebAPI.Configuration;

public class AuthCookieOptions
{
    public const string SectionName = "AuthCookie";

    public string Name { get; set; } = "token";
    public bool HttpOnly { get; set; } = true;
    public bool Secure { get; set; } = true;
    public bool IsEssential { get; set; } = true;
    public SameSiteMode SameSite { get; set; } = SameSiteMode.None;
    public int MaxAgeMinutes { get; set; } = 60;

    public AuthCookieOptions Validate()
    {
        if (string.IsNullOrWhiteSpace(Name))
            throw new InvalidOperationException($"{SectionName}:Name is not configured.");

        if (MaxAgeMinutes <= 0)
            throw new InvalidOperationException($"{SectionName}:MaxAgeMinutes must be greater than 0.");

        return this;
    }
}
