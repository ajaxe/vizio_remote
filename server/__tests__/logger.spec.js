import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { jsonLogger, serverLogger } from '../middleware/logger.js';
import { app } from '../index.js';

describe('Console JSON Logger Middleware for Hono', () => {
  /** @type {string[]} */
  let loggedOutputs;
  /** @type {(msg: string) => void} */
  let outputSpy;

  beforeEach(() => {
    loggedOutputs = [];
    outputSpy = (msg) => {
      loggedOutputs.push(msg);
    };
  });

  it('logs successful 200 requests as structured JSON with level "info"', async () => {
    const testApp = new Hono();
    testApp.use('*', jsonLogger({ output: outputSpy }));
    testApp.get('/test-success', (c) => c.json({ ok: true }));

    const res = await testApp.request('/test-success');
    expect(res.status).toBe(200);

    expect(loggedOutputs.length).toBe(1);
    const parsed = JSON.parse(loggedOutputs[0]);

    expect(parsed.level).toBe('info');
    expect(parsed.method).toBe('GET');
    expect(parsed.path).toBe('/test-success');
    expect(parsed.status).toBe(200);
    expect(typeof parsed.durationMs).toBe('number');
    expect(parsed.durationMs).toBeGreaterThanOrEqual(0);
    expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp);
  });

  it('logs 4xx client errors as structured JSON with level "warn"', async () => {
    const testApp = new Hono();
    testApp.use('*', jsonLogger({ output: outputSpy }));
    testApp.get('/not-found', (c) => c.json({ error: 'not found' }, 404));

    const res = await testApp.request('/not-found');
    expect(res.status).toBe(404);

    expect(loggedOutputs.length).toBe(1);
    const parsed = JSON.parse(loggedOutputs[0]);

    expect(parsed.level).toBe('warn');
    expect(parsed.status).toBe(404);
    expect(parsed.path).toBe('/not-found');
  });

  it('logs 5xx server errors as structured JSON with level "error"', async () => {
    const testApp = new Hono();
    testApp.use('*', jsonLogger({ output: outputSpy }));
    testApp.get('/server-error', (c) => c.json({ error: 'fail' }, 500));

    const res = await testApp.request('/server-error');
    expect(res.status).toBe(500);

    expect(loggedOutputs.length).toBe(1);
    const parsed = JSON.parse(loggedOutputs[0]);

    expect(parsed.level).toBe('error');
    expect(parsed.status).toBe(500);
    expect(parsed.path).toBe('/server-error');
  });

  it('captures uncaught exceptions, logs level "error" with stack, and rethrows', async () => {
    const testApp = new Hono();
    testApp.use('*', jsonLogger({ output: outputSpy }));
    testApp.get('/crash', () => {
      throw new Error('Database connection failed');
    });

    const res = await testApp.request('/crash');
    expect(res.status).toBe(500);

    expect(loggedOutputs.length).toBe(1);
    const parsed = JSON.parse(loggedOutputs[0]);

    expect(parsed.level).toBe('error');
    expect(parsed.error).toBe('Database connection failed');
    expect(typeof parsed.stack).toBe('string');
  });

  it('captures query parameters, client IP, User-Agent, and Request-ID', async () => {
    const testApp = new Hono();
    testApp.use('*', jsonLogger({ output: outputSpy }));
    testApp.get('/details', (c) => c.text('ok'));

    const res = await testApp.request('/details?foo=bar&num=42', {
      headers: {
        'x-forwarded-for': '203.0.113.195, 70.41.3.18',
        'user-agent': 'VizioRemoteApp/1.0',
        'x-request-id': 'req-abc-123'
      }
    });
    expect(res.status).toBe(200);

    expect(loggedOutputs.length).toBe(1);
    const parsed = JSON.parse(loggedOutputs[0]);

    expect(parsed.query).toEqual({ foo: 'bar', num: '42' });
    expect(parsed.ip).toBe('203.0.113.195');
    expect(parsed.userAgent).toBe('VizioRemoteApp/1.0');
    expect(parsed.requestId).toBe('req-abc-123');
  });

  it('supports includeHeaders option to log all request headers', async () => {
    const testApp = new Hono();
    testApp.use('*', jsonLogger({ output: outputSpy, includeHeaders: true }));
    testApp.get('/headers', (c) => c.text('ok'));

    await testApp.request('/headers', {
      headers: {
        'x-custom-test': 'my-custom-value'
      }
    });

    const parsed = JSON.parse(loggedOutputs[0]);
    expect(parsed.headers).toBeDefined();
    expect(parsed.headers['x-custom-test']).toBe('my-custom-value');
  });

  it('omits query field when no query string is provided', async () => {
    const testApp = new Hono();
    testApp.use('*', jsonLogger({ output: outputSpy }));
    testApp.get('/no-query', (c) => c.text('ok'));

    await testApp.request('/no-query');
    const parsed = JSON.parse(loggedOutputs[0]);
    expect(parsed.query).toBeUndefined();
  });

  describe('serverLogger helper', () => {
    it('outputs valid JSON for serverLogger.info', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      serverLogger.info('Service ready', { port: 3000 });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logString = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(logString);

      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Service ready');
      expect(parsed.port).toBe(3000);
      expect(parsed.timestamp).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('outputs valid JSON for serverLogger.warn', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      serverLogger.warn('High latency detected', { durationMs: 2500 });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logString = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(logString);

      expect(parsed.level).toBe('warn');
      expect(parsed.message).toBe('High latency detected');
      expect(parsed.durationMs).toBe(2500);

      consoleSpy.mockRestore();
    });

    it('outputs valid JSON for serverLogger.error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      serverLogger.error('Connection failed', { code: 'ECONNREFUSED' });

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logString = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(logString);

      expect(parsed.level).toBe('error');
      expect(parsed.message).toBe('Connection failed');
      expect(parsed.code).toBe('ECONNREFUSED');

      consoleSpy.mockRestore();
    });
  });

  describe('Integration with main application', () => {
    it('outputs JSON log when requests are handled by the main app', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const res = await app.request('/api/apps');
      expect(res.status).toBe(200);

      expect(consoleSpy).toHaveBeenCalled();
      const lastCall = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0];
      const parsed = JSON.parse(lastCall);

      expect(parsed.method).toBe('GET');
      expect(parsed.path).toBe('/api/apps');
      expect(parsed.status).toBe(200);
      expect(parsed.level).toBe('info');

      consoleSpy.mockRestore();
    });
  });
});
