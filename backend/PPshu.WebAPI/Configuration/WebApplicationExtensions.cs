using Microsoft.AspNetCore.Builder;

namespace PPshu.WebAPI.Configuration;

public static class WebApplicationExtensions
{
    public static void UseWeb(this WebApplication app)
    {
        app.UseHttpsRedirection();
        app.MapControllers();
        app.MapHealthChecks("/api/health");

        app.UseAuthentication();
        app.UseAuthorization();
    }
    
    public static void UseWebDevelopment(this WebApplication app)
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }
}