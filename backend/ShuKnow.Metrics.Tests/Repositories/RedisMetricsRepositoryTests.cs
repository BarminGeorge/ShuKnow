using AwesomeAssertions;
using NSubstitute;
using ShuKnow.Metrics.Repositories;
using StackExchange.Redis;

namespace ShuKnow.Metrics.Tests.Repositories;

public class RedisMetricsRepositoryTests
{
    private IConnectionMultiplexer redis = null!;
    private IDatabase db = null!;
    private RedisMetricsRepository sut = null!;

    [SetUp]
    public void SetUp()
    {
        redis = Substitute.For<IConnectionMultiplexer>();
        db = Substitute.For<IDatabase>();

        redis.GetDatabase(Arg.Any<int>(), Arg.Any<object>()).Returns(db);
        sut = new RedisMetricsRepository(new Lazy<IConnectionMultiplexer>(() => redis));
    }

    [TearDown]
    public void TearDown()
    {
        redis.Dispose();
    }

    [Test]
    public async Task TrySaveItemAsync_WhenScriptReturnsOne_ShouldReturnTrueAndPassExpectedArgs()
    {
        var itemId = Guid.NewGuid();
        var savedAt = DateTimeOffset.UtcNow;
        var ttl = TimeSpan.FromDays(30);

        db.ScriptEvaluateAsync(Arg.Any<LuaScript>(), Arg.Any<object>(), Arg.Any<CommandFlags>())
            .Returns(Task.FromResult(RedisResult.Create((RedisValue)1, ResultType.Integer)));

        var result = await sut.TrySaveItemAsync(itemId, savedAt, ttl);

        result.Should().BeTrue();
        await db.Received(1).ScriptEvaluateAsync(
            Arg.Any<LuaScript>(),
            Arg.Is<object>(args => MatchSaveItemScriptArgs(args, itemId, savedAt, ttl)),
            Arg.Any<CommandFlags>());
    }

    [Test]
    public async Task TrySaveItemAsync_WhenScriptReturnsZero_ShouldReturnFalse()
    {
        db.ScriptEvaluateAsync(Arg.Any<LuaScript>(), Arg.Any<object>(), Arg.Any<CommandFlags>())
            .Returns(Task.FromResult(RedisResult.Create((RedisValue)0, ResultType.Integer)));

        var result = await sut.TrySaveItemAsync(Guid.NewGuid(), DateTimeOffset.UtcNow, TimeSpan.FromDays(30));

        result.Should().BeFalse();
    }

    [Test]
    public async Task MarkItemAiProcessedAsync_ShouldSetAiMarkerWithTtl()
    {
        var itemId = Guid.NewGuid();

        await sut.MarkItemAiProcessedAsync(itemId, TimeSpan.FromDays(30));

        var call = db.ReceivedCalls().Single(c => c.GetMethodInfo().Name == nameof(IDatabase.StringSetAsync));
        var args = call.GetArguments();

        var key = args[0]?.ToString();
        var value = args[1]?.ToString();
        key.Should().Be($"metrics:item:{itemId}:ai");
        value.Should().Be("1");
    }

    [Test]
    public async Task TryMarkItemManuallyMovedAsync_ShouldUseNotExistsSemantic()
    {
        var itemId = Guid.NewGuid();
        var ttl = TimeSpan.FromDays(30);
        db.StringSetAsync(Arg.Any<RedisKey>(), Arg.Any<RedisValue>(), Arg.Any<TimeSpan?>(), Arg.Any<When>())
            .Returns(Task.FromResult(true));

        var result = await sut.TryMarkItemManuallyMovedAsync(itemId, ttl);

        result.Should().BeTrue();
        await db.Received(1).StringSetAsync(
            $"metrics:item:{itemId}:moved",
            "1",
            ttl,
            When.NotExists);
    }

    [Test]
    public async Task GetItemSavedAtAsync_WhenValueMissing_ShouldReturnNull()
    {
        var itemId = Guid.NewGuid();
        db.StringGetAsync($"metrics:item:{itemId}", Arg.Any<CommandFlags>())
            .Returns(Task.FromResult(RedisValue.Null));

        var result = await sut.GetItemSavedAtAsync(itemId);

        result.Should().BeNull();
    }

    [Test]
    public async Task GetItemSavedAtAsync_WhenValueExists_ShouldParseUnixTime()
    {
        var itemId = Guid.NewGuid();
        var expected = DateTimeOffset.UtcNow.AddMinutes(-3);
        var unix = expected.ToUnixTimeSeconds();

        db.StringGetAsync($"metrics:item:{itemId}", Arg.Any<CommandFlags>())
            .Returns(Task.FromResult((RedisValue)unix.ToString()));

        var result = await sut.GetItemSavedAtAsync(itemId);

        result.Should().Be(DateTimeOffset.FromUnixTimeSeconds(unix));
    }

    [Test]
    public async Task TryRegisterFirstSaveAsync_ShouldStoreUnixTimestampWithNotExistsSemantic()
    {
        var userId = Guid.NewGuid();
        var savedAt = DateTimeOffset.UtcNow;
        var ttl = TimeSpan.FromDays(14);
        db.StringSetAsync(Arg.Any<RedisKey>(), Arg.Any<RedisValue>(), Arg.Any<TimeSpan?>(), Arg.Any<When>())
            .Returns(Task.FromResult(true));

        var result = await sut.TryRegisterFirstSaveAsync(userId, savedAt, ttl);

        result.Should().BeTrue();
        await db.Received(1).StringSetAsync(
            $"metrics:user:{userId}:first_save",
            savedAt.ToUnixTimeSeconds(),
            ttl,
            When.NotExists);
    }

    [Test]
    public async Task GetUserFirstSaveAtAsync_WhenValueMissing_ShouldReturnNull()
    {
        var userId = Guid.NewGuid();
        db.StringGetAsync($"metrics:user:{userId}:first_save", Arg.Any<CommandFlags>())
            .Returns(Task.FromResult(RedisValue.Null));

        var result = await sut.GetUserFirstSaveAtAsync(userId);

        result.Should().BeNull();
    }

    [Test]
    public async Task GetUserFirstSaveAtAsync_WhenValueExists_ShouldParseUnixTime()
    {
        var userId = Guid.NewGuid();
        var expected = DateTimeOffset.UtcNow.AddDays(-9);
        var unix = expected.ToUnixTimeSeconds();

        db.StringGetAsync($"metrics:user:{userId}:first_save", Arg.Any<CommandFlags>())
            .Returns(Task.FromResult((RedisValue)unix.ToString()));

        var result = await sut.GetUserFirstSaveAtAsync(userId);

        result.Should().Be(DateTimeOffset.FromUnixTimeSeconds(unix));
    }

    [Test]
    public async Task TryMarkUserReturnedAsync_ShouldUseNotExistsSemantic()
    {
        var userId = Guid.NewGuid();
        var ttl = TimeSpan.FromDays(14);
        db.StringSetAsync(Arg.Any<RedisKey>(), Arg.Any<RedisValue>(), Arg.Any<TimeSpan?>(), Arg.Any<When>())
            .Returns(Task.FromResult(true));

        var result = await sut.TryMarkUserReturnedAsync(userId, ttl);

        result.Should().BeTrue();
        await db.Received(1).StringSetAsync(
            $"metrics:user:{userId}:returned",
            "1",
            ttl,
            When.NotExists);
    }

    [Test]
    public async Task IsItemAiProcessedAsync_ShouldQueryAiMarkerKey()
    {
        var itemId = Guid.NewGuid();
        db.KeyExistsAsync($"metrics:item:{itemId}:ai", Arg.Any<CommandFlags>())
            .Returns(Task.FromResult(true));

        var result = await sut.IsItemAiProcessedAsync(itemId);

        result.Should().BeTrue();
    }

    private static bool MatchSaveItemScriptArgs(object args, Guid itemId, DateTimeOffset savedAt, TimeSpan ttl)
    {
        var keyProperty = args.GetType().GetProperty("key");
        var valueProperty = args.GetType().GetProperty("value");
        var ttlProperty = args.GetType().GetProperty("ttlMilliseconds");
        if (keyProperty is null || valueProperty is null || ttlProperty is null)
            return false;

        var key = keyProperty.GetValue(args)?.ToString();
        var value = valueProperty.GetValue(args);
        var ttlMilliseconds = ttlProperty.GetValue(args);

        return key == $"metrics:item:{itemId}"
               && value is long unixSeconds && unixSeconds == savedAt.ToUnixTimeSeconds()
               && ttlMilliseconds is long ttlMs && ttlMs == (long)ttl.TotalMilliseconds;
    }
}
