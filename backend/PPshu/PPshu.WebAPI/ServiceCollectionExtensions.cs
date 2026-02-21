using Microsoft.Extensions.DependencyInjection;

namespace PPshu.WebAPI;

public static class ServiceCollectionExtensions
{
    public static void AddWeb(this IServiceCollection services)
    {
        services.AddControllers().AddApplicationPart(typeof(ServiceCollectionExtensions).Assembly);
        services.AddEndpointsApiExplorer();
        
        services.AddSwaggerGen();
    }
}