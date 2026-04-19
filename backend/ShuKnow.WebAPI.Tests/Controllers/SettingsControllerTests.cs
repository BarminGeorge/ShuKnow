using Ardalis.Result;
using AwesomeAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using NSubstitute;
using ShuKnow.Application.Interfaces;
using ShuKnow.Domain.Entities;
using ShuKnow.Domain.VO;
using ShuKnow.WebAPI.Controllers;
using ShuKnow.WebAPI.Dto.Settings;
using ShuKnow.WebAPI.Requests.Settings;
using ApiAiProvider = ShuKnow.WebAPI.Dto.Enums.AiProvider;
using DomainAiProvider = ShuKnow.Domain.Enums.AiProvider;

namespace ShuKnow.WebAPI.Tests.Controllers;

public class SettingsControllerTests
{
    private ISettingsService settingsService = null!;
    private SettingsController sut = null!;

    [SetUp]
    public void SetUp()
    {
        settingsService = Substitute.For<ISettingsService>();
        sut = new SettingsController(settingsService)
        {
            ControllerContext = CreateControllerContext()
        };
    }

    [Test]
    public async Task GetAiSettings_WhenSettingsExist_ShouldReturnMaskedSettings()
    {
        var settings = new UserAiSettings(
            Guid.NewGuid(),
            baseUrl: "https://api.example.com",
            apiKeyEncrypted: "encrypted-key",
            provider: DomainAiProvider.OpenAI,
            modelId: "gpt-test");
        settingsService.GetOrCreateAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success(settings)));

        var response = await sut.GetAiSettings(CancellationToken.None);

        var dto = GetOkValue<AiSettingsDto>(response);
        dto.BaseUrl.Should().Be("https://api.example.com");
        dto.ApiKeyMasked.Should().Be("****-key");
        dto.Provider.Should().Be(ApiAiProvider.OpenAI);
        dto.ModelId.Should().Be("gpt-test");
        dto.IsConfigured.Should().BeTrue();
    }

    [Test]
    public async Task UpdateAiSettings_WhenRequestProvided_ShouldPassUpdateInputAndReturnSettings()
    {
        UpdateAiSettingsInput? capturedInput = null;
        var settings = new UserAiSettings(
            Guid.NewGuid(),
            baseUrl: "https://new.example.com",
            apiKeyEncrypted: "new-secret",
            provider: DomainAiProvider.Gemini,
            modelId: "gemini-test");
        settingsService.UpdateAsync(
                Arg.Do<UpdateAiSettingsInput>(input => capturedInput = input),
                Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success(settings)));

        var response = await sut.UpdateAiSettings(
            new UpdateAiSettingsRequest(
                "https://new.example.com",
                "plain-key",
                ApiAiProvider.Gemini,
                "gemini-test"),
            CancellationToken.None);

        var dto = GetOkValue<AiSettingsDto>(response);
        dto.Provider.Should().Be(ApiAiProvider.Gemini);
        dto.ModelId.Should().Be("gemini-test");
        capturedInput.Should().NotBeNull();
        capturedInput!.BaseUrl.Should().Be("https://new.example.com");
        capturedInput.ApiKey.Should().Be("plain-key");
        capturedInput.Provider.Should().Be(DomainAiProvider.Gemini);
        capturedInput.ModelId.Should().Be("gemini-test");
    }

    [Test]
    public async Task TestAiConnection_WhenServiceSucceeds_ShouldReturnTestResult()
    {
        settingsService.TestConnectionAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(Result.Success((true, (int?)123, (string?)null))));

        var response = await sut.TestAiConnection(CancellationToken.None);

        var dto = GetOkValue<AiConnectionTestDto>(response);
        dto.Success.Should().BeTrue();
        dto.LatencyMs.Should().Be(123);
        dto.ErrorMessage.Should().BeNull();
    }

    private static T GetOkValue<T>(ActionResult<T> response)
    {
        var objectResult = response.Result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status200OK);
        return objectResult.Value.Should().BeAssignableTo<T>().Subject;
    }

    private static ControllerContext CreateControllerContext()
    {
        return new ControllerContext
        {
            HttpContext = new DefaultHttpContext(),
            ActionDescriptor = new ControllerActionDescriptor()
        };
    }
}
