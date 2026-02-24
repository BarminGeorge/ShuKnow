using Microsoft.AspNetCore.Http;

namespace PPshu.WebAPI.Interfaces;

public interface IAuthCookieService
{
    void SetAuthCookie(HttpResponse response, string token);
}