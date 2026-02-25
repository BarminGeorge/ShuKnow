using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using ShuKnow.Application.Common;
using ShuKnow.Application.Interfaces;

namespace ShuKnow.Infrastructure.Services;

public class JwtService(IOptions<JwtOptions> options) : IJwtService
{
    private static readonly JwtSecurityTokenHandler Handler = new();

    private readonly JwtOptions options = options.Value; 
    private readonly SigningCredentials credentials = new(
        new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.Value.Key)),
        SecurityAlgorithms.HmacSha256);
    
    public string GenerateToken(Guid userId)
    {
        var claims = new Claim[] { new(JwtRegisteredClaimNames.Sub, userId.ToString()) };

        var token = new JwtSecurityToken(
            claims: claims,
            signingCredentials: credentials,
            issuer: options.Issuer,
            audience: options.Audience,
            expires: DateTime.UtcNow.AddMinutes(options.ExpiresInMinutes)
        );

        return Handler.WriteToken(token);
    }
}