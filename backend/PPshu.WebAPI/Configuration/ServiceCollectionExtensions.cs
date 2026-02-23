using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using PPshu.Application.Common;
using PPshu.Application.Interfaces;
using PPshu.WebAPI.Services;

namespace PPshu.WebAPI.Configuration;

public static class ServiceCollectionExtensions
{
    public static void AddWeb(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddControllers().AddApplicationPart(typeof(ServiceCollectionExtensions).Assembly);
        services.AddHealthChecks();

        services.AddHttpContextAccessor();
        services.AddEndpointsApiExplorer();
        services.AddSwagger();

        services.AddAuth(configuration);
        
        services.AddScoped<ICurrentUserService, CurrentUserService>();
    }

    private static void AddAuth(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtOptions = configuration.GetJwtOptions();

        services.Configure<JwtOptions>(options =>
        {
            options.Key = jwtOptions.Key;
            options.ExpiresInMinutes = jwtOptions.ExpiresInMinutes;
        });

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
                    ClockSkew = TimeSpan.Zero
                };
                
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        if (!string.IsNullOrEmpty(context.Token))
                            return Task.CompletedTask;
                        if (context.Request.Cookies.TryGetValue("token", out var token))
                            context.Token = token;
                        return Task.CompletedTask;
                    }
                };
            });
        
        services.AddAuthorization();
    }

    private static void AddSwagger(this IServiceCollection services)
    {
        services.AddSwaggerGen(options =>
        {
            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Enter JWT Token"
            });

            options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference("Bearer", document)] = []
            });
        });
    }

    private static JwtOptions GetJwtOptions(this IConfiguration configuration)
    {
        var jwtSection = configuration.GetSection("Jwt");
        var jwtOptions = jwtSection.Get<JwtOptions>() ?? new JwtOptions();
        
        return string.IsNullOrEmpty(jwtOptions.Key)
            ? throw new InvalidOperationException("JWT__KEY is not configured")
            : jwtOptions;
    }
}