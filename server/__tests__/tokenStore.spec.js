import { describe, it, expect, beforeEach } from 'vitest';
import RedisMock from 'ioredis-mock';
import { getAuthToken, setAuthToken, deleteAuthToken, getAuthTokenKey } from '../tokenStore.js';

describe('TokenStore (Redis)', () => {
  let mockRedis;

  beforeEach(() => {
    mockRedis = new RedisMock();
  });

  it('generates consistent redis keys', () => {
    expect(getAuthTokenKey('192.168.1.50')).toBe('vizio:token:192.168.1.50');
  });

  it('stores and retrieves an auth token', async () => {
    await setAuthToken('192.168.1.50', 'sample-auth-token-123', 0, mockRedis);
    const token = await getAuthToken(mockRedis);
    expect(token).toBe('sample-auth-token-123');
  });

  it('returns null when no token is present', async () => {
    const token = await getAuthToken(mockRedis);
    expect(token).toBeNull();
  });

  it('supports token expiration when ttlSeconds is provided', async () => {
    await setAuthToken('192.168.1.50', 'temp-token', 3600, mockRedis);
    const token = await getAuthToken(mockRedis);
    expect(token).toBe('temp-token');
  });

  it('deletes a stored auth token', async () => {
    await setAuthToken('192.168.1.50', 'token-to-delete', 0, mockRedis);
    await deleteAuthToken('192.168.1.50', mockRedis);
    const token = await getAuthToken(mockRedis);
    expect(token).toBeNull();
  });
});
