using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PPshu.Infrastructure.PostgreSQL;

namespace PPshu.Infrastructure.Configuration;

public static class ServiceProviderExtensions
{
    public static void ApplyMigrations(this IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        context.Database.Migrate();
    }
}