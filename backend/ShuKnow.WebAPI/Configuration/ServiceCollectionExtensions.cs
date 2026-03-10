using System.Text;
using FluentValidation;
using FluentValidation.AspNetCore;
using Saunter;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using ShuKnow.Application.Common;
using ShuKnow.Application.Interfaces;
using ShuKnow.WebAPI.Hubs;
using ShuKnow.WebAPI.Interfaces;
using ShuKnow.WebAPI.Services;

namespace ShuKnow.WebAPI.Configuration;

public static class ServiceCollectionExtensions
{
    public static void AddWeb(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddControllers().AddApplicationPart(typeof(ServiceCollectionExtensions).Assembly);
        services.AddSignalR();
        
        services.AddValidation();
        services.AddHealthChecks();

        services.AddHttpContextAccessor();
        services.AddEndpointsApiExplorer();
        services.AddSwagger();
        services.AddAsyncApiSchemaGeneration(options =>
        {
            options.AssemblyMarkerTypes = new[] { typeof(ServiceCollectionExtensions) };
            options.AsyncApi = new Saunter.AsyncApiSchema.v2.AsyncApiDocument
            {
                Info = new Saunter.AsyncApiSchema.v2.Info("ShuKnow AsyncAPI", "1.0.0")
            };
        });

        services.AddAuth(configuration);

        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IAuthCookieService, AuthCookieService>();
    }
    
    private static void AddValidation(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(typeof(ServiceCollectionExtensions).Assembly);
        services.AddFluentValidationAutoValidation();
    }

    private static void AddAuth(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtOptions = configuration.GetJwtOptions();
        var authCookieOptions = configuration.GetAuthCookieOptions();

        services.Configure<JwtOptions>(options =>
        {
            options.Key = jwtOptions.Key;
            options.ExpiresInMinutes = jwtOptions.ExpiresInMinutes;
            options.Issuer = jwtOptions.Issuer;
            options.Audience = jwtOptions.Audience;
        });

        services.Configure<AuthCookieOptions>(options =>
        {
            options.Name = authCookieOptions.Name;
            options.HttpOnly = authCookieOptions.HttpOnly;
            options.Secure = authCookieOptions.Secure;
            options.IsEssential = authCookieOptions.IsEssential;
            options.SameSite = authCookieOptions.SameSite;
            options.MaxAgeMinutes = authCookieOptions.MaxAgeMinutes;
        });

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtOptions.Issuer,
                    ValidAudience = jwtOptions.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
                    ClockSkew = TimeSpan.Zero
                };

                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        if (!string.IsNullOrEmpty(context.Token))
                            return Task.CompletedTask;
                        if (context.Request.Cookies.TryGetValue(authCookieOptions.Name, out var token))
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
        var jwtSection = configuration.GetSection(JwtOptions.SectionName);
        var jwtOptions = jwtSection.Get<JwtOptions>() ?? new JwtOptions();
        return jwtOptions.Validate();
    }

    private static AuthCookieOptions GetAuthCookieOptions(this IConfiguration configuration)
    {
        var authCookieSection = configuration.GetSection(AuthCookieOptions.SectionName);
        var authCookieOptions = authCookieSection.Get<AuthCookieOptions>() ?? new AuthCookieOptions();

        return authCookieOptions.Validate();
    }
}