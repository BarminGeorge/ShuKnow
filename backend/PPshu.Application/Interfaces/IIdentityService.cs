using Ardalis.Result;

namespace PPshu.Application.Interfaces;

public interface IIdentityService
{
    Task<Result<string>> RegisterAsync(string login, string password);
    Task<Result<string>> LoginAsync(string login, string password);
}
