import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { jsonLogger, serverLogger } from './middleware/logger.js';
import { config } from './config.js';
import { statusRoute } from './routes/status.js';
import { pairingRoute } from './routes/pairing.js';
import { controlRoute } from './routes/control.js';
import { appsRoute } from './routes/apps.js';

export const app = new Hono();

app.use('*', jsonLogger());
app.use('/api/*', cors());

// API route groups
app.route('/api/status', statusRoute);
app.route('/api/pair', pairingRoute);
app.route('/api/control', controlRoute);
app.route('/api/apps', appsRoute);

// Serve static frontend build from dist/ in production
app.use('/*', serveStatic({ root: './dist' }));
app.get('*', serveStatic({ path: './dist/index.html' }));

// Global error handler for unhandled endpoint errors
app.onError((err, c) => {
  serverLogger.error(`[Server Error] Unhandled exception on ${c.req.method} ${c.req.path}: ${err.message}`, {
    method: c.req.method,
    path: c.req.path,
    error: err.message,
    stack: err.stack
  });
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

// Start server if not running in test suite
if (process.env.NODE_ENV !== 'test') {
  serve(
    {
      fetch: app.fetch,
      port: config.port
    },
    (info) => {
      serverLogger.info(`[Hono Server] Running on http://localhost:${info.port}`, {
        port: info.port
      });
    }
  );
}
