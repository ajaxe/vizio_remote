import { redis } from "./redisClient.js";
import { config } from "./config.js";
import { serverLogger } from "./middleware/logger.js";

export const APP_KEY_PREFIX = "vizio-remote";

/**
 * Returns the auth token Redis key for a given TV IP.
 * @param {string} ip
 * @returns {string}
 */
export function getAuthTokenKey(ip) {
  return `${APP_KEY_PREFIX}:token:${ip.trim()}`;
}

/**
 * Retrieves the stored auth token for a given TV IP.
 * 
 * @param {import('ioredis').Redis} [client=redis]
 * @returns {Promise<string | null>}
 */
export async function getAuthToken(client = redis) {
  try {
    const remote = await getCurrentTvRemote()
    return remote ? remote.token : null;
  } catch (err) {
    serverLogger.error(`[TokenStore] Failed to get token:`, {
      error: err.message,
    });
    return null;
  }
}

/**
 * Stores the auth token for a given TV IP in Redis.
 * @param {string} ip
 * @param {string} token
 * @param {import('ioredis').Redis} [client=redis]
 * @returns {Promise<void>}
 */
export async function setAuthToken(ip, token, client = redis) {
  if (!ip || !token) return;
  const key = getAuthTokenKey(ip);
  try {
    await client.set(key, token);
  } catch (err) {
    serverLogger.error(`[TokenStore] Failed to save token for ${ip}:`, {
      error: err.message,
    });
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
    serverLogger.error(`[TokenStore] Failed to delete token for ${ip}:`, {
      error: err.message,
    });
  }
}

/**
 * Returns the current TV remote data (IP, MAC, and token) from Redis.
 *
 * @param {import('ioredis').Redis} client
 * @returns {Promise<import('../types').TvRemoteData | null>}
 */
export async function getCurrentTvRemote(client = redis) {
  const key = `${APP_KEY_PREFIX}:remotes`;
  const v = await client.get(key);
  const d = v ? JSON.parse(v) : null;
  return d && d.length > 0 ? d[0] : null;
}

/**
 * Sets the current TV remote data (IP, MAC, and token) in Redis.
 *
 * @param {import('../types').TvRemoteData} param0
 * @param {import('ioredis').Redis} client
 */
export async function setCurrentTvRemote(
  { ip, mac, token, deviceId, deviceName, status = "paired" },
  client = redis,
) {
  const key = `${APP_KEY_PREFIX}:remotes`;
  await client.set(
    key,
    JSON.stringify([{ ip, mac, token, deviceId, deviceName, status }]),
  );
}
