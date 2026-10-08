import { describe, it, expect, beforeEach } from 'vitest';
import { getSavedTvIp, saveTvIp, clearSavedTvIp } from '../services/storage.js';

describe('Storage Service (Domain LocalStorage)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty string when no IP is saved', () => {
    expect(getSavedTvIp()).toBe('');
  });

  it('saves and retrieves the TV IP', () => {
    saveTvIp('192.168.1.150');
    expect(getSavedTvIp()).toBe('192.168.1.150');
  });

  it('clears the saved TV IP', () => {
    saveTvIp('192.168.1.150');
    clearSavedTvIp();
    expect(getSavedTvIp()).toBe('');
  });
});
