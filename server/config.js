import dotenv from 'dotenv';
dotenv.config();

/**
 * @type {import('../types').ServerConfig}
 */
export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  redisUrl: process.env.REDIS_URL || 'redis://redis.internal.apogee-dev.com:6379',
  tokenTtlSeconds: parseInt(process.env.TOKEN_TTL_SECONDS || '0', 10),
  defaultTvIp: process.env.DEFAULT_TV_IP || ''
};
