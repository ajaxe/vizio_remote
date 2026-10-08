import Redis from 'ioredis';
import { config } from './config.js';

/**
 * Creates and configures the Redis client instance.
 * @param {string} [url] - Optional Redis connection URL override
 * @returns {import('ioredis').Redis}
 */
export function createRedisClient(url = config.redisUrl) {
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 3000);
      return delay;
    }
  });

  client.on('connect', () => {
    console.log(`[Redis] Connected to ${url}`);
  });

  client.on('error', (err) => {
    console.warn(`[Redis] Connection warning: ${err.message}`);
  });

  return client;
}

/** @type {import('ioredis').Redis} */
export const redis = createRedisClient();

// Connect asynchronously without crashing on initial boot if offline
if (process.env.NODE_ENV !== 'test') {
  redis.connect().catch((err) => {
    console.warn(`[Redis] Initial connection attempt: ${err.message}`);
  });
}
