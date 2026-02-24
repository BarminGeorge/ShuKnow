using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using PPshu.WebAPI.Configuration;
using PPshu.WebAPI.Interfaces;

namespace PPshu.WebAPI.Services;

public class AuthCookieService(IOptions<AuthCookieOptions> options) : IAuthCookieService
{
    private readonly AuthCookieOptions options = options.Value;

    public void SetAuthCookie(HttpResponse response, string token)
    {
        response.Cookies.Append(options.Name, token, new CookieOptions
        {
            HttpOnly = options.HttpOnly,
            Secure = options.Secure,
            IsEssential = options.IsEssential,
            SameSite = options.SameSite,
            MaxAge = TimeSpan.FromMinutes(options.MaxAgeMinutes)
        });
    }
}
