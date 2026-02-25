using Microsoft.AspNetCore.Builder;

namespace ShuKnow.WebAPI.Configuration;

public static class WebApplicationExtensions
{
    public static void UseWeb(this WebApplication app)
    {
        app.UseHttpsRedirection();
        app.UseAuthentication();
        app.UseAuthorization();
        
        app.MapControllers();
        app.MapHealthChecks("/api/health");
    }
    
    public static void UseWebDevelopment(this WebApplication app)
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }
}