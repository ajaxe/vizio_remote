import { redis } from './redisClient.js';
import { config } from './config.js';
import { serverLogger } from './middleware/logger.js';

/**
 * Returns the auth token Redis key for a given TV IP.
 * @param {string} ip
 * @returns {string}
 */
export function getAuthTokenKey(ip) {
  return `vizio:token:${ip.trim()}`;
}

export async function getDeviceId(client = redis) {
  const key = 'vizio-remote:deviceId';
  try {
    let deviceId = await client.get(key);
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      await client.set(key, deviceId);
    }
    return deviceId;
  } catch (err) {
    serverLogger.error('[TokenStore] Failed to get or set device ID:', { error: err.message });
    return null;
  }
}

/**
 * Retrieves the stored auth token for a given TV IP.
 * @param {string} ip
 * @param {import('ioredis').Redis} [client=redis]
 * @returns {Promise<string | null>}
 */
export async function getAuthToken(ip, client = redis) {
  if (!ip) return null;
  try {
    return await client.get(getAuthTokenKey(ip));
  } catch (err) {
    serverLogger.error(`[TokenStore] Failed to get token for ${ip}:`, { error: err.message });
    return null;
  }
}

/**
 * Stores the auth token for a given TV IP in Redis.
 * @param {string} ip
 * @param {string} token
 * @param {number} [ttlSeconds=config.tokenTtlSeconds]
 * @param {import('ioredis').Redis} [client=redis]
 * @returns {Promise<void>}
 */
export async function setAuthToken(ip, token, ttlSeconds = config.tokenTtlSeconds, client = redis) {
  if (!ip || !token) return;
  const key = getAuthTokenKey(ip);
  try {
    if (ttlSeconds > 0) {
      await client.set(key, token, 'EX', ttlSeconds);
    } else {
      await client.set(key, token);
    }
  } catch (err) {
    serverLogger.error(`[TokenStore] Failed to save token for ${ip}:`, { error: err.message });
  }
}

/**
 * Deletes the stored auth token for a given TV IP.
 * @param {string} ip
 * @param {import('ioredis').Redis} [client=redis]
 * @returns {Promise<void>}
 */
export async function deleteAuthToken(ip, client = redis) {
  if (!ip) return;
  try {
    await client.del(getAuthTokenKey(ip));
  } catch (err) {
    serverLogger.error(`[TokenStore] Failed to delete token for ${ip}:`, { error: err.message });
  }
}
