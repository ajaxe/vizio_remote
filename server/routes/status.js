import { Hono } from 'hono';
import { getCurrentTvRemote } from '../tokenStore.js';
import { serverLogger } from '../middleware/logger.js';

export const statusRoute = new Hono();

statusRoute.get('/', async (c) => {
  const ip = c.req.query('ip');
  if (!ip) {
    serverLogger.error('Missing TV IP query parameter in GET /api/status', {
      path: c.req.path
    });
    return c.json({ error: 'Missing TV IP query parameter' }, 400);
  }

  try {
    const remote = await getCurrentTvRemote();
    
    return c.json({
      ip,
      paired: remote.status === "paired",
    });
  } catch (err) {
    serverLogger.error(`Failed to get status for ${ip} in GET /api/status`, {
      ip,
      error: err?.message || String(err)
    });
    return c.json({ error: 'Failed to get TV status', details: err?.message }, 500);
  }
});
