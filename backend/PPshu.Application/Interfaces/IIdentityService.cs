using Ardalis.Result;

namespace PPshu.Application.Interfaces;

public interface IIdentityService
{
    Task<Result> RegisterAsync(string login, string password);
    Task<Result<string>> LoginAsync(string login, string password);
}