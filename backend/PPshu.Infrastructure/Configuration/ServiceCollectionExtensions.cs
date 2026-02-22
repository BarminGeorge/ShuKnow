using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PPshu.Infrastructure.PostgreSQL;

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
    }
}