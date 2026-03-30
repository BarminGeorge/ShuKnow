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
        var seeded = await SeedSettingsAsync(user.Id);

        var result = await sut.GetByUserAsync(user.Id);

        result.Status.Should().Be(ResultStatus.Ok);
        result.Value.UserId.Should().Be(user.Id);
        result.Value.BaseUrl.Should().Be(seeded.BaseUrl);
        result.Value.ApiKeyEncrypted.Should().Be(seeded.ApiKeyEncrypted);
        result.Value.LastTestSuccess.Should().BeNull();
        result.Value.LastTestLatencyMs.Should().BeNull();
        result.Value.LastTestError.Should().BeNull();
        Context.ChangeTracker.Entries<UserAiSettings>().Should().BeEmpty();
    }

    [Test]
    public async Task GetByUserAsync_WhenSettingsDoNotExist_ShouldReturnNotFound()
    {
        var user = await SeedUserAsync();

        var result = await sut.GetByUserAsync(user.Id);

        result.Status.Should().Be(ResultStatus.NotFound);
        Context.ChangeTracker.Entries<UserAiSettings>().Should().BeEmpty();
    }

    [Test]
    public async Task GetByUserAsync_WhenOtherUserHasSettings_ShouldReturnNotFound()
    {
        var user = await SeedUserAsync();
        var otherUser = await SeedUserAsync();
        await SeedSettingsAsync(otherUser.Id);

        var result = await sut.GetByUserAsync(user.Id);

        result.Status.Should().Be(ResultStatus.NotFound);
    }

    [Test]
    public async Task UpsertAsync_WhenNoSettingsExist_ShouldInsertNewSettings()
    {
        var user = await SeedUserAsync();
        var settings = new UserAiSettings(user.Id, "https://api.example.com", "enc-key-123");

        var result = await sut.UpsertAsync(settings);
        await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.Ok);

        await using var assertContext = CreateDbContext();
        var persisted = await assertContext.UserAiSettings.SingleAsync(s => s.UserId == user.Id);

        persisted.BaseUrl.Should().Be("https://api.example.com");
        persisted.ApiKeyEncrypted.Should().Be("enc-key-123");
        persisted.LastTestSuccess.Should().BeNull();
    }

    [Test]
    public async Task UpsertAsync_WhenSettingsAlreadyExist_ShouldUpdateSettings()
    {
        var user = await SeedUserAsync();
        await SeedSettingsAsync(user.Id, "https://old-api.example.com", "old-key");

        var updated = new UserAiSettings(
            user.Id,
            "https://new-api.example.com",
            "new-key",
            lastTestSuccess: true,
            lastTestLatencyMs: 42,
            lastTestError: null);

        var result = await sut.UpsertAsync(updated);
        await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.Ok);

        await using var assertContext = CreateDbContext();
        var persisted = await assertContext.UserAiSettings.SingleAsync(s => s.UserId == user.Id);

        persisted.BaseUrl.Should().Be("https://new-api.example.com");
        persisted.ApiKeyEncrypted.Should().Be("new-key");
        persisted.LastTestSuccess.Should().BeTrue();
        persisted.LastTestLatencyMs.Should().Be(42);
    }

    [Test]
    public async Task UpsertAsync_WhenUserDoesNotExist_ShouldFailOnSave()
    {
        var nonExistentUserId = Guid.NewGuid();
        var settings = new UserAiSettings(nonExistentUserId, "https://api.example.com", "enc-key");

        var result = await sut.UpsertAsync(settings);
        var act = async () => await Context.SaveChangesAsync();

        result.Status.Should().Be(ResultStatus.Ok);
        await act.Should().ThrowAsync<DbUpdateException>();
    }

    private async Task<User> SeedUserAsync(Guid? userId = null)
    {
        var user = new User(userId ?? Guid.NewGuid(), "testuser");

        await using var seedContext = CreateDbContext();
        seedContext.Users.Add(user);
        await seedContext.SaveChangesAsync();

        return user;
    }

    private async Task<UserAiSettings> SeedSettingsAsync(
        Guid userId,
        string baseUrl = "https://api.test.com",
        string apiKeyEncrypted = "test-encrypted-key")
    {
        var settings = new UserAiSettings(userId, baseUrl, apiKeyEncrypted);

        await using var seedContext = CreateDbContext();
        seedContext.UserAiSettings.Add(settings);
        await seedContext.SaveChangesAsync();

        return settings;
    }
}
