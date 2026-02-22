using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PPshu.Application.Common;
using PPshu.Application.Interfaces;

namespace PPshu.WebAPI.Services;

public class JwtService(IOptions<JwtOptions> options) : IJwtService
{
    public string GenerateToken(Guid userId)
    {
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.Value.Key)),
            SecurityAlgorithms.HmacSha256);
        
        var claims = new Claim[] { new(ClaimTypes.NameIdentifier, userId.ToString()) };

        var token = new JwtSecurityToken(
            claims: claims,
            signingCredentials: credentials,
            expires: DateTime.UtcNow.AddMinutes(options.Value.ExpiresInMinutes)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}