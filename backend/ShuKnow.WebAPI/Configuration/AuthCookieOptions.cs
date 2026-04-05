using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace ShuKnow.WebAPI.Configuration;

public class AuthCookieOptions
{
    public const string SectionName = "AuthCookie";

    [Required(AllowEmptyStrings = false)]
    public string Name { get; set; } = "token";

    public bool HttpOnly { get; set; } = true;

    public bool Secure { get; set; } = true;

    public bool IsEssential { get; set; } = true;

    public SameSiteMode SameSite { get; set; } = SameSiteMode.None;

    [Range(1, int.MaxValue)]
    public int MaxAgeMinutes { get; set; } = 60;
}
