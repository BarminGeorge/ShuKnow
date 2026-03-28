using Ardalis.Result;
using AwesomeAssertions;
using Microsoft.EntityFrameworkCore;
using ShuKnow.Domain.Entities;
using ShuKnow.Infrastructure.Persistent.Repositories;

namespace ShuKnow.Infrastructure.IntegrationTests.Persistent.Repositories;

public class SettingsRepositoryTests : BaseRepositoryTests
{
    private SettingsRepository sut = null!;

    public override async Task SetUp()
    {
        await base.SetUp();
        sut = new SettingsRepository(Context);
    }

    [Test]
    public async Task GetByUserAsync_WhenSettingsExist_ShouldReturnSettingsWithoutTracking()
    {
        var user = await SeedUserAsync();
        var seededSettings = await SeedSettingsAsync(user.Id);

        var result = await sut.GetByUserAsync(user.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.UserId.Should().Be(user.Id);
        result.Value.BaseUrl.Should().Be(seededSettings.BaseUrl);
        result.Value.ApiKeyEncrypted.Should().Be(seededSettings.ApiKeyEncrypted);
        result.Value.LastTestSuccess.Should().Be(seededSettings.LastTestSuccess);
        result.Value.LastTestLatencyMs.Should().Be(seededSettings.LastTestLatencyMs);
        result.Value.LastTestError.Should().Be(seededSettings.LastTestError);
        Context.ChangeTracker.Entries<UserAiSettings>().Should().BeEmpty();
    }

    [Test]
    public async Task GetByUserAsync_WhenSettingsDoNotExist_ShouldReturnNotFound()
    {
        var result = await sut.GetByUserAsync(Guid.NewGuid());

        result.Status.Should().Be(ResultStatus.NotFound);
        Context.ChangeTracker.Entries<UserAiSettings>().Should().BeEmpty();
    }

    [Test]
    public async Task UpsertAsync_WhenSettingsDoNotExist_ShouldInsertSettings()
    {
        var user = await SeedUserAsync();
        var settings = new UserAiSettings(
            user.Id,
            "https://api.example.com/v1",
            "encrypted-key-1",
            true,
            123,
            null);

        var result = await sut.UpsertAsync(settings);
        await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.Ok);

        await using var assertContext = CreateDbContext();
        var persisted = await assertContext.UserAiSettings.SingleAsync(existing => existing.UserId == user.Id);

        persisted.BaseUrl.Should().Be("https://api.example.com/v1");
        persisted.ApiKeyEncrypted.Should().Be("encrypted-key-1");
        persisted.LastTestSuccess.Should().BeTrue();
        persisted.LastTestLatencyMs.Should().Be(123);
        persisted.LastTestError.Should().BeNull();
    }

    [Test]
    public async Task UpsertAsync_WhenSettingsExist_ShouldUpdateSettings()
    {
        var user = await SeedUserAsync();
        await SeedSettingsAsync(user.Id);

        var updatedSettings = new UserAiSettings(
            user.Id,
            "https://proxy.example.ai/v2",
            "encrypted-key-2",
            false,
            null,
            "connection failed");

        var result = await sut.UpsertAsync(updatedSettings);
        await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.Ok);

        await using var assertContext = CreateDbContext();
        var persisted = await assertContext.UserAiSettings.SingleAsync(existing => existing.UserId == user.Id);

        persisted.BaseUrl.Should().Be("https://proxy.example.ai/v2");
        persisted.ApiKeyEncrypted.Should().Be("encrypted-key-2");
        persisted.LastTestSuccess.Should().BeFalse();
        persisted.LastTestLatencyMs.Should().BeNull();
        persisted.LastTestError.Should().Be("connection failed");
    }

    private async Task<User> SeedUserAsync(Guid? userId = null)
    {
        var user = new User(userId ?? Guid.NewGuid());

        await using var seedContext = CreateDbContext();
        seedContext.Users.Add(user);
        await seedContext.SaveChangesAsync();

        return user;
    }

    private async Task<UserAiSettings> SeedSettingsAsync(Guid userId)
    {
        var settings = new UserAiSettings(
            userId,
            "https://api.openai.com/v1",
            "encrypted-key-seeded",
            true,
            250,
            null);

        await using var seedContext = CreateDbContext();
        seedContext.UserAiSettings.Add(settings);
        await seedContext.SaveChangesAsync();

        return settings;
    }
}
