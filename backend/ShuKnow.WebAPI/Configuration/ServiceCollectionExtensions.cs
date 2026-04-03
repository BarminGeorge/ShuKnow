using System.Text;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Saunter;
using Saunter.AsyncApiSchema.v2;
using ShuKnow.Application.Common;
using ShuKnow.Application.Interfaces;
using ShuKnow.WebAPI.Hubs;
using ShuKnow.WebAPI.Interfaces;
using ShuKnow.WebAPI.Services;
using SecuritySchemeType = Microsoft.OpenApi.SecuritySchemeType;

namespace ShuKnow.WebAPI.Configuration;

public static class ServiceCollectionExtensions
{
    public static void AddWeb(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddWebOptions();
        services.AddExceptionHandler<GlobalExceptionHandler>();
        services.AddProblemDetails();
        
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
            options.AsyncApi = new AsyncApiDocument
            {
                Info = new Info("ShuKnow AsyncAPI", "1.0.0")
            };
        });

        services.AddAuth();

        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<ICurrentConnectionService, CurrentConnectionService>();
        services.AddScoped<IAuthCookieService, AuthCookieService>();
        services.AddScoped<IChatNotificationService, ChatNotificationService>();
    }

    private static void AddValidation(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(typeof(ServiceCollectionExtensions).Assembly);
        services.AddFluentValidationAutoValidation();
        services.AddSingleton<IHubFilter, ValidationHubFilter>();
    }

    private static void AddAuth(this IServiceCollection services)
    {
        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer();

        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtOptions>, IOptions<AuthCookieOptions>>((options, jwtOptionsAccessor, authCookieOptionsAccessor) =>
            {
                var jwtOptions = jwtOptionsAccessor.Value;
                var authCookieOptions = authCookieOptionsAccessor.Value;

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

    private static void AddWebOptions(this IServiceCollection services)
    {
        services.AddOptions<JwtOptions>()
            .BindConfiguration(JwtOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<AuthCookieOptions>()
            .BindConfiguration(AuthCookieOptions.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();
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
}
