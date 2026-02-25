using Microsoft.AspNetCore.Http;

namespace ShuKnow.WebAPI.Interfaces;

public interface IAuthCookieService
{
    void SetAuthCookie(HttpResponse response, string token);
}