using System.Security.Claims;
using System.Text.Encodings.Web;
using Ardalis.Result;
using AwesomeAssertions;
using FluentValidation;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ShuKnow.Application.Interfaces;
using ShuKnow.Application.Models;
using ShuKnow.Application.Models.Notifications;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.Enums;
using ShuKnow.Domain.VO;
using ShuKnow.WebAPI.Events;
using ShuKnow.WebAPI.Hubs;
using ShuKnow.WebAPI.Requests.Validators;
using ShuKnow.WebAPI.Services;
using File = ShuKnow.Domain.Entities.File;

namespace ShuKnow.WebAPI.IntegrationTests.Hubs;

public class ChatHubIntegrationTests
{
    private TestServer server = null!;
    private WebApplication app = null!;
    private RecordingAiService aiService = null!;
    private RecordingChatNotificationService chatNotificationService = null!;
    private RecordingProcessingOperationService operationService = null!;

    [SetUp]
    public async Task SetUp()
    {
        var builder = WebApplication.CreateBuilder();

        builder.WebHost.UseTestServer();
        builder.Services.AddLogging();
        builder.Services.AddSignalR(options =>
        {
            options.AddFilter<CurrentConnectionHubFilter>();
            options.AddFilter<ValidationHubFilter>();
        });
        builder.Services.AddAuthentication(TestAuthHandler.AuthenticationScheme)
            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.AuthenticationScheme, _ => { });
        builder.Services.AddAuthorization();
        builder.Services.AddSingleton<IValidator<SendMessageCommand>, SendMessageCommandValidator>();
        builder.Services.AddSingleton<IHubFilter, CurrentConnectionHubFilter>();
        builder.Services.AddSingleton<IHubFilter, ValidationHubFilter>();

        aiService = new RecordingAiService();
        chatNotificationService = new RecordingChatNotificationService();
        operationService = new RecordingProcessingOperationService();

        builder.Services.AddSingleton<IAiService>(aiService);
        builder.Services.AddSingleton<IChatNotificationService>(chatNotificationService);
        builder.Services.AddSingleton<ISettingsService>(new StubSettingsService());
        builder.Services.AddSingleton<IProcessingOperationService>(operationService);
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddScoped<ICurrentConnectionService, CurrentConnectionService>();

        app = builder.Build();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapHub<ChatHub>("/hubs/chat");

        await app.StartAsync();
        server = app.GetTestServer();
    }

    [TearDown]
    public async Task TearDown()
    {
        server.Dispose();

        if (app is not null)
            await app.DisposeAsync();
    }

    [Test]
    public async Task SendMessage_WhenCommandIsValid_ShouldInvokeHubPipelineAndDependencies()
    {
        await using var connection = CreateConnection();
        var attachmentId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        await connection.StartAsync();
        await connection.InvokeAsync(
            nameof(ChatHub.SendMessage),
            new SendMessageCommand(sessionId, "Organize this", AttachmentIds: [attachmentId]));

        aiService.Calls.Should().HaveCount(1);
        aiService.Calls[0].Content.Should().Be("Organize this");
        aiService.Calls[0].AttachmentIds.Should().BeEquivalentTo([attachmentId]);

        operationService.BeginCalls.Should().HaveCount(1);
        operationService.BeginCalls[0].Should().NotBeNullOrWhiteSpace();
        operationService.CompletedOperations.Should().HaveCount(1);

        chatNotificationService.Events.Should().ContainInOrder(
            $"started:{operationService.LastOperationId}",
            $"completed:{operationService.LastOperationId}");
    }

    [Test]
    public async Task SendMessage_WhenCommandIsInvalid_ShouldEmitValidationFailedEvent()
    {
        await using var connection = CreateConnection();
        ValidationFailedEvent? validationFailed = null;

        connection.On<ValidationFailedEvent>(nameof(ChatHub.OnValidationFailed), @event => validationFailed = @event);

        await connection.StartAsync();

        var act = async () => await connection.InvokeAsync(
            nameof(ChatHub.SendMessage),
            new SendMessageCommand(Guid.NewGuid(), string.Empty));

        await act.Should().ThrowAsync<HubException>();
        await WaitForAsync(() => validationFailed is not null);

        validationFailed.Should().NotBeNull();
        validationFailed!.TargetMethod.Should().Be(nameof(ChatHub.SendMessage));
        validationFailed.Errors.Should().ContainSingle();
        validationFailed.Errors[0].PropertyName.Should().Be("Content");
        validationFailed.Errors[0].ErrorMessage.Should().Be("Content is required");

        aiService.Calls.Should().BeEmpty();
        operationService.BeginCalls.Should().BeEmpty();
        chatNotificationService.Events.Should().BeEmpty();
    }

    private HubConnection CreateConnection()
    {
        return new HubConnectionBuilder()
            .WithUrl(
                new Uri(server.BaseAddress, "/hubs/chat"),
                options =>
                {
                    options.Transports = HttpTransportType.LongPolling;
                    options.HttpMessageHandlerFactory = _ => server.CreateHandler();
                })
            .Build();
    }

    private static async Task WaitForAsync(Func<bool> condition)
    {
        for (var attempt = 0; attempt < 20; attempt++)
        {
            if (condition())
                return;

            await Task.Delay(25);
        }
    }

    private sealed class RecordingAiService : IAiService
    {
        public List<AiCall> Calls { get; } = [];

        public Task<Result> ProcessMessageAsync(
            string content,
            IReadOnlyCollection<Guid>? attachmentIds,
            UserAiSettings settings,
            Guid operationId,
            CancellationToken ct = default)
        {
            Calls.Add(new AiCall(content, attachmentIds?.ToArray() ?? [], settings, operationId));
            return Task.FromResult(Result.Success());
        }

        public Task<UserAiSettings> TestConnectionAsync(UserAiSettings settings, CancellationToken ct = default)
        {
            return Task.FromResult(settings);
        }
    }

    private sealed record AiCall(
        string Content,
        IReadOnlyCollection<Guid> AttachmentIds,
        UserAiSettings Settings,
        Guid OperationId);

    private sealed class RecordingChatNotificationService : IChatNotificationService
    {
        public List<string> Events { get; } = [];

        public Task SendProcessingStartedAsync(Guid operationId, CancellationToken ct = default)
        {
            Events.Add($"started:{operationId}");
            return Task.CompletedTask;
        }

        public Task SendMessageChunkAsync(Guid operationId, Guid messageId, string chunk, CancellationToken ct = default)
            => Task.CompletedTask;

        public Task SendMessageCompletedAsync(Guid operationId, Guid messageId, CancellationToken ct = default)
            => Task.CompletedTask;

        public Task SendFileCreatedAsync(File file, CancellationToken ct = default)
            => Task.CompletedTask;

        public Task SendFileMovedAsync(File file, Guid? fromFolderId, CancellationToken ct = default)
            => Task.CompletedTask;

        public Task SendFolderCreatedAsync(Folder folder, CancellationToken ct = default)
            => Task.CompletedTask;

        public Task SendTextAppendedAsync(File file, string text, CancellationToken ct = default)
            => Task.CompletedTask;

        public Task SendTextPrependedAsync(File file, string text, CancellationToken ct = default)
            => Task.CompletedTask;

        public Task SendAttachmentSavedAsync(ChatAttachment attachment, string fileName, CancellationToken ct = default)
            => Task.CompletedTask;

        public Task SendProcessingCompletedAsync(Guid operationId, CancellationToken ct = default)
        {
            Events.Add($"completed:{operationId}");
            return Task.CompletedTask;
        }

        public Task SendProcessingFailedAsync(
            Guid operationId,
            string error,
            ChatProcessingErrorCode errorCode = ChatProcessingErrorCode.InternalError,
            CancellationToken ct = default)
        {
            Events.Add($"failed:{operationId}:{errorCode}:{error}");
            return Task.CompletedTask;
        }
    }

    private sealed class RecordingProcessingOperationService : IProcessingOperationService
    {
        public List<string> BeginCalls { get; } = [];
        public List<(string ConnectionId, Guid OperationId)> CompletedOperations { get; } = [];
        public Guid LastOperationId { get; private set; }

        public ProcessingOperation BeginOperation(string connectionId)
        {
            BeginCalls.Add(connectionId);
            LastOperationId = Guid.NewGuid();
            return new ProcessingOperation(LastOperationId, new CancellationTokenSource());
        }

        public void CancelOperation(string connectionId)
        {
        }

        public void CompleteOperation(string connectionId, Guid operationId)
        {
            CompletedOperations.Add((connectionId, operationId));
        }
    }

    private sealed class StubSettingsService : ISettingsService
    {
        public Task<Result<UserAiSettings>> GetOrCreateAsync(CancellationToken ct = default)
        {
            return Task.FromResult(Result.Success(new UserAiSettings(
                Guid.NewGuid(),
                "https://api.example.test",
                "encrypted-key",
                AiProvider.OpenAI,
                "gpt-test")));
        }

        public Task<Result<UserAiSettings>> UpdateAsync(UpdateAiSettingsInput input, CancellationToken ct = default)
        {
            throw new NotSupportedException();
        }

        public Task<Result<(bool Success, int? LatencyMs, string? ErrorMessage)>> TestConnectionAsync(CancellationToken ct = default)
        {
            throw new NotSupportedException();
        }
    }

    private sealed class TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        public const string AuthenticationScheme = "Test";

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var identity = new ClaimsIdentity(
                [new Claim(ClaimTypes.NameIdentifier, "chat-hub-test-user")],
                AuthenticationScheme);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, AuthenticationScheme);
            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }
}
