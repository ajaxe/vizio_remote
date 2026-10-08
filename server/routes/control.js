import { Hono } from 'hono';
import { executeCommand } from '../vizioService.js';
import { serverLogger } from '../middleware/logger.js';

export const controlRoute = new Hono();

controlRoute.post('/', async (c) => {
  let body;
  try {
    body = await c.req.json();
  } catch (err) {
    serverLogger.error('Invalid JSON payload in POST /api/control', {
      path: c.req.path,
      error: err?.message || String(err)
    });
    return c.json({ error: 'Invalid JSON payload' }, 400);
  }

  const { ip, action } = body || {};
  if (!ip || !action) {
    serverLogger.error('Missing TV IP or action parameter in POST /api/control', {
      path: c.req.path,
      ip: ip || null,
      action: action || null
    });
    return c.json({ error: 'Missing TV IP or action parameter' }, 400);
  }

  try {
    const result = await executeCommand(ip, action);
    return c.json({ success: true, result });
  } catch (err) {
    if (err && err.message === 'NO_AUTH_TOKEN') {
      serverLogger.error(`TV is not paired (NO_AUTH_TOKEN) for ${ip} in POST /api/control`, {
        ip,
        action
      });
      return c.json({ error: 'NO_AUTH_TOKEN', message: 'TV is not paired' }, 401);
    }
    serverLogger.error(`Command execution failed for ${action} on ${ip} in POST /api/control`, {
      ip,
      action,
      error: err?.message || String(err)
    });
    return c.json(
      { error: err && err.message ? err.message : 'Command failed', details: err },
      500
    );
  }
});
