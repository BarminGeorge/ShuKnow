using Microsoft.AspNetCore.Builder;
using Saunter;
using ShuKnow.WebAPI.Hubs;

namespace ShuKnow.WebAPI.Configuration;

public static class WebApplicationExtensions
{
    public static void UseWeb(this WebApplication app)
    {
        app.UseExceptionHandler();
        
        app.UseHttpsRedirection();
        app.UseAuthentication();
        app.UseAuthorization();
        
        app.MapControllers();
        app.MapHealthChecks("/api/health");
        app.MapHub<ChatHub>("/hubs/chat");
    }
    
    public static void UseWebDevelopment(this WebApplication app)
    {
        app.UseSwagger();
        app.UseSwaggerUI();
        app.MapAsyncApiDocuments();
        app.MapAsyncApiUi();
    }
}