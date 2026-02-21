using PPshu.Application;
using PPshu.Domain;
using PPshu.Infrastructure;
using PPshu.WebAPI;

namespace PPshu.Host;

public static class Program
{
    public static async Task Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.Services.ConfigureServices(builder.Configuration);
        
        var app = builder.Build();
        app.ConfigureApp();

        await app.RunAsync();
    }
    
    private static void ConfigureServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDomain();
        services.AddInfrastructure();
        services.AddApplication();
        services.AddWeb();
    }
    
    private static void ConfigureApp(this WebApplication app)
    {
        app.UseHttpsRedirection();
        app.MapControllers();
        
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }
    }
}