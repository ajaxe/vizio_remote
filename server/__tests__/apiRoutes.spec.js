import { describe, it, expect, vi } from 'vitest';
import { app } from '../index.js';

describe('Hono API Routes (via app.request)', () => {
  it('GET /api/status returns 400 when ip query param is missing', async () => {
    const res = await app.request('/api/status');
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain('Missing TV IP');
  });

  it('GET /api/status returns 200 with paired status when ip is provided', async () => {
    const res = await app.request('/api/status?ip=192.168.1.100');
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ip).toBe('192.168.1.100');
    expect(typeof json.paired).toBe('boolean');
  });

  it('GET /api/apps returns the 12 curated streaming applications', async () => {
    const res = await app.request('/api/apps');
    expect(res.status).toBe(200);

    const apps = await res.json();
    expect(Array.isArray(apps)).toBe(true);
    expect(apps.length).toBe(12);

    const netflix = apps.find((a) => a.id === 'netflix');
    expect(netflix).toBeDefined();
    expect(netflix.name).toBe('Netflix');
    expect(netflix.color).toBe('#E50914');
  });

  it('POST /api/control returns 400 when required fields are missing', async () => {
    const res = await app.request('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain('Missing TV IP');
  });

  it('POST /api/pair/initiate returns 400 when TV IP is missing', async () => {
    const res = await app.request('/api/pair/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain('Missing TV IP');
  });

  it('POST /api/pair/confirm returns 400 when pin is missing', async () => {
    const res = await app.request('/api/pair/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: '192.168.1.100' })
    });
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain('Missing TV IP or PIN');
  });
});
