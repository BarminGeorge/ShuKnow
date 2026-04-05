using System.ComponentModel.DataAnnotations;

namespace ShuKnow.Application.Common;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required(AllowEmptyStrings = false)]
    public string Key { get; set; } = "";

    [Range(1, int.MaxValue)]
    public int ExpiresInMinutes { get; set; } = 60;

    [Required(AllowEmptyStrings = false)]
    public string Issuer { get; set; } = "";

    [Required(AllowEmptyStrings = false)]
    public string Audience { get; set; } = "";
}
