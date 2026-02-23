using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PPshu.Application.Interfaces;
using PPshu.Domain.Repositories;
using PPshu.Infrastructure.Interfaces;
using PPshu.Infrastructure.Persistent;
using PPshu.Infrastructure.Persistent.Repositories;
using PPshu.Infrastructure.Services;

namespace PPshu.Infrastructure.Configuration;

public static class ServiceCollectionExtensions
{
    public static void AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>((_, options) =>
        {
            var connectionString = configuration.GetConnectionString("Postgres");
            options
                .UseNpgsql(connectionString)
                .UseSnakeCaseNamingConvention();
        });
        
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IIdentityService, IdentityService>();
        services.AddScoped<IJwtService, JwtService>();
        
        services.AddScoped<IUserRepository, UserRepository>();
    }
}