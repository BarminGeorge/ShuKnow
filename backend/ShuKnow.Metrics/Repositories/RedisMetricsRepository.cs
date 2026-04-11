using StackExchange.Redis;

namespace ShuKnow.Metrics.Repositories;

public class RedisMetricsRepository(IConnectionMultiplexer redis) : IMetricsRepository
{
    private const string Prefix = "metrics";
    private static string ItemKey(Guid id) => $"{Prefix}:item:{id}";
    private static string ItemAiKey(Guid id) => $"{Prefix}:item:{id}:ai";
    private static string ItemMovedKey(Guid id) => $"{Prefix}:item:{id}:moved";
    private static string ItemRetrievedKey(Guid id) => $"{Prefix}:item:{id}:retrieved";
    private static string UserFirstSaveKey(Guid id) => $"{Prefix}:user:{id}:first_save";
    private static string UserReturnedKey(Guid id) => $"{Prefix}:user:{id}:returned";

    public async Task<bool> TrySaveItemAsync(Guid itemId, DateTimeOffset savedAt, TimeSpan ttl)
    {
        var db = redis.GetDatabase();
        var key = ItemKey(itemId);
        var unixSeconds = savedAt.ToUnixTimeSeconds();

        return await db.StringSetAsync(key, unixSeconds, ttl, When.NotExists);
    }

    public async Task MarkItemAiProcessedAsync(Guid itemId, TimeSpan ttl)
    {
        var db = redis.GetDatabase();
        await db.StringSetAsync(ItemAiKey(itemId), "1", ttl);
    }

    public async Task<bool> IsItemAiProcessedAsync(Guid itemId)
    {
        var db = redis.GetDatabase();
        return await db.KeyExistsAsync(ItemAiKey(itemId));
    }

    public async Task<bool> TryMarkItemManuallyMovedAsync(Guid itemId, TimeSpan ttl)
    {
        var db = redis.GetDatabase();
        return await db.StringSetAsync(ItemMovedKey(itemId), "1", ttl, When.NotExists);
    }

    public async Task<DateTimeOffset?> GetItemSavedAtAsync(Guid itemId)
    {
        var db = redis.GetDatabase();
        var value = await db.StringGetAsync(ItemKey(itemId));

        if (value.IsNullOrEmpty)
            return null;

        return DateTimeOffset.FromUnixTimeSeconds(long.Parse(value!));
    }

    public async Task<bool> TryMarkItemRetrievedAsync(Guid itemId, TimeSpan ttl)
    {
        var db = redis.GetDatabase();
        return await db.StringSetAsync(ItemRetrievedKey(itemId), "1", ttl, When.NotExists);
    }

    public async Task<bool> TryRegisterFirstSaveAsync(Guid userId, DateTimeOffset savedAt, TimeSpan ttl)
    {
        var db = redis.GetDatabase();
        var unixSeconds = savedAt.ToUnixTimeSeconds();

        return await db.StringSetAsync(UserFirstSaveKey(userId), unixSeconds, ttl, When.NotExists);
    }

    public async Task<DateTimeOffset?> GetUserFirstSaveAtAsync(Guid userId)
    {
        var db = redis.GetDatabase();
        var value = await db.StringGetAsync(UserFirstSaveKey(userId));

        if (value.IsNullOrEmpty)
            return null;

        return DateTimeOffset.FromUnixTimeSeconds(long.Parse(value!));
    }

    public async Task<bool> TryMarkUserReturnedAsync(Guid userId, TimeSpan ttl)
    {
        var db = redis.GetDatabase();
        return await db.StringSetAsync(UserReturnedKey(userId), "1", ttl, When.NotExists);
    }
}