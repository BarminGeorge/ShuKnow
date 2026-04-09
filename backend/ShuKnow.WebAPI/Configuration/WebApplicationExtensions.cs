using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using Saunter;
using ShuKnow.WebAPI.Hubs;

namespace ShuKnow.WebAPI.Configuration;

public static class WebApplicationExtensions
{
    public static void UseWeb(this WebApplication app)
    {
        app.UseExceptionHandler();

        var forwardedHeadersOptions = new ForwardedHeadersOptions
        {
            ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
        };
        forwardedHeadersOptions.KnownNetworks.Clear();
        forwardedHeadersOptions.KnownProxies.Clear();
        app.UseForwardedHeaders(forwardedHeadersOptions);
        
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