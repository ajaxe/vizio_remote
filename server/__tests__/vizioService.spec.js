import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeCommand, confirmPairing, getClient } from '../vizioService.js';

describe('VizioService', () => {
  let mockTokenStore;
  let tokens;

  beforeEach(() => {
    tokens = new Map();
    mockTokenStore = {
      getAuthToken: vi.fn(async (ip) => tokens.get(ip) || null),
      setAuthToken: vi.fn(async (ip, token) => {
        tokens.set(ip, token);
      }),
      deleteAuthToken: vi.fn(async (ip) => {
        tokens.delete(ip);
      })
    };
  });

  it('throws NO_AUTH_TOKEN if no token is stored in Redis', async () => {
    await expect(
      executeCommand('192.168.1.100', 'up', undefined, mockTokenStore)
    ).rejects.toThrow('NO_AUTH_TOKEN');
  });

  it('dispatches commands when token is present', async () => {
    tokens.set('192.168.1.100', 'valid-test-token');

    const { client } = await getClient('192.168.1.100', 'valid-test-token', mockTokenStore);

    // Mock client control methods
    client.control = {
      navigate: {
        up: vi.fn(async () => ({ status: 'success' })),
        down: vi.fn(async () => ({ status: 'success' })),
        left: vi.fn(async () => ({ status: 'success' })),
        right: vi.fn(async () => ({ status: 'success' })),
        ok: vi.fn(async () => ({ status: 'success' })),
        back: vi.fn(async () => ({ status: 'success' }))
      },
      volume: {
        up: vi.fn(async () => ({ status: 'success' })),
        down: vi.fn(async () => ({ status: 'success' })),
        mute: vi.fn(async () => ({ status: 'success' }))
      },
      keyCommand: vi.fn(async () => ({ status: 'success' }))
    };

    // Test Navigation commands
    await executeCommand('192.168.1.100', 'up', 'valid-test-token', mockTokenStore);
    expect(client.control.navigate.up).toHaveBeenCalled();

    await executeCommand('192.168.1.100', 'ok', 'valid-test-token', mockTokenStore);
    expect(client.control.navigate.ok).toHaveBeenCalled();

    await executeCommand('192.168.1.100', 'back', 'valid-test-token', mockTokenStore);
    expect(client.control.navigate.back).toHaveBeenCalled();

    // Test Volume and Mute commands
    await executeCommand('192.168.1.100', 'vol_up', 'valid-test-token', mockTokenStore);
    expect(client.control.volume.up).toHaveBeenCalled();

    await executeCommand('192.168.1.100', 'mute', 'valid-test-token', mockTokenStore);
    expect(client.control.volume.mute).toHaveBeenCalled();

    // Test Home keyCommand (codeset 4, code 3)
    await executeCommand('192.168.1.100', 'home', 'valid-test-token', mockTokenStore);
    expect(client.control.keyCommand).toHaveBeenCalledWith(4, 3);
  });

  it('persists auth token to tokenStore upon confirmPairing success', async () => {
    const { client } = await getClient('192.168.1.105', undefined, mockTokenStore);
    client.pairing = {
      pair: vi.fn(async () => ({
        STATUS: { RESULT: 'SUCCESS' },
        ITEM: { AUTH_TOKEN: 'retrieved-new-token-456' }
      }))
    };

    const res = await confirmPairing('192.168.1.105', '1234', 999, mockTokenStore);

    expect(res.STATUS.RESULT).toBe('SUCCESS');
    expect(mockTokenStore.setAuthToken).toHaveBeenCalledWith(
      '192.168.1.105',
      'retrieved-new-token-456'
    );
    expect(tokens.get('192.168.1.105')).toBe('retrieved-new-token-456');
  });
});
