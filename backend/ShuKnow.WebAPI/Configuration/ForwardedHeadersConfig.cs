using System.ComponentModel.DataAnnotations;
using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace ShuKnow.WebAPI.Configuration;

public class ForwardedHeadersConfig
{
    public const string SectionName = "ForwardedHeaders";

    [Range(1, int.MaxValue)]
    public int ForwardLimit { get; set; } = 1;

    public string[] KnownProxies { get; set; } = [];

    public string[] KnownNetworks { get; set; } = [];
}

internal class ConfigureForwardedHeadersOptions(IOptions<ForwardedHeadersConfig> config, IHostEnvironment environment)
    : IConfigureOptions<ForwardedHeadersOptions>
{
    private readonly ForwardedHeadersConfig config = config.Value;

    public void Configure(ForwardedHeadersOptions options)
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.ForwardLimit = config.ForwardLimit;

        if (environment.IsDevelopment())
        {
            options.KnownProxies.Clear();
            options.KnownNetworks.Clear();
        }
        else
        {
            foreach (var proxy in config.KnownProxies)
            {
                if (IPAddress.TryParse(proxy, out var parsedProxy))
                    options.KnownProxies.Add(parsedProxy);
            }

            foreach (var network in config.KnownNetworks)
            {
                var parts = network.Split('/', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length != 2) continue;
                if (!IPAddress.TryParse(parts[0], out var prefix)) continue;
                if (!int.TryParse(parts[1], out var length)) continue;
                options.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(prefix, length));
            }
        }
    }
}