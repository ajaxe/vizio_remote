import { Hono } from 'hono';
import { VIZIO_APPS } from '../appsCatalog.js';
import { launchApp } from '../vizioService.js';
import { serverLogger } from '../middleware/logger.js';

export const appsRoute = new Hono();

// Return the curated list of Vizio streaming applications
appsRoute.get('/', (c) => {
  try {
    return c.json(VIZIO_APPS);
  } catch (err) {
    serverLogger.error('Failed to get apps catalog in GET /api/apps', {
      path: c.req.path,
      error: err?.message || String(err)
    });
    return c.json({ error: 'Failed to retrieve applications' }, 500);
  }
});

// Launch a specific application on the TV
appsRoute.post('/launch', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch (err) {
    serverLogger.error('Invalid JSON payload in POST /api/apps/launch', {
      path: c.req.path,
      error: err?.message || String(err)
    });
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  const { ip, appId, nameSpace, message } = body || {};
  if (!ip || !appId) {
    serverLogger.error('Missing TV IP or appId parameter in POST /api/apps/launch', {
      path: c.req.path,
      ip: ip || null,
      appId: appId || null
    });
    return c.json({ error: 'Missing TV IP or appId parameter' }, 400);
  }

  try {
    const result = await launchApp(ip, appId, nameSpace, message);
    return c.json({ success: true, result });
  } catch (err) {
    if (err && err.message === 'NO_AUTH_TOKEN') {
      serverLogger.error(`TV is not paired (NO_AUTH_TOKEN) for ${ip} in POST /api/apps/launch`, {
        ip,
        appId
      });
      return c.json({ error: 'NO_AUTH_TOKEN', message: 'TV is not paired' }, 401);
    }
    serverLogger.error(`App launch failed for ${appId} on ${ip} in POST /api/apps/launch`, {
      ip,
      appId,
      error: err?.message || String(err)
    });
    return c.json(
      { error: err && err.message ? err.message : 'App launch failed', details: err },
      500
    );
  }
});
