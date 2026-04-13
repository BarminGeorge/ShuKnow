local exists = redis.call('EXISTS', @key)
redis.call('SET', @key, @value, 'PX', @ttlMilliseconds)
return exists == 0 and 1 or 0